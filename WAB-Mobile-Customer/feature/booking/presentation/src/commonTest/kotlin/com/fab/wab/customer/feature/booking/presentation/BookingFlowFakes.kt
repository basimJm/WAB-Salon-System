package com.fab.wab.customer.feature.booking.presentation

import com.fab.wab.customer.core.analytics.NoOpAnalyticsTracker
import com.fab.wab.customer.core.domain.AppError
import com.fab.wab.customer.core.domain.AppResult
import com.fab.wab.customer.core.domain.ErrorCode
import com.fab.wab.customer.core.domain.booking.PaymentMethod
import com.fab.wab.customer.feature.booking.domain.model.BookingDraft
import com.fab.wab.customer.feature.booking.domain.model.CreatedBooking
import com.fab.wab.customer.feature.booking.domain.model.DraftMoney
import com.fab.wab.customer.feature.booking.domain.model.DraftPolicy
import com.fab.wab.customer.feature.booking.domain.repository.BookingDraftRepository
import com.fab.wab.customer.feature.booking.domain.usecase.CreateBookingDraftUseCase
import com.fab.wab.customer.feature.booking.domain.usecase.DeleteBookingDraftUseCase
import com.fab.wab.customer.feature.booking.domain.model.AvailabilitySlot
import com.fab.wab.customer.feature.booking.domain.model.DayAvailability
import com.fab.wab.customer.feature.booking.domain.model.DraftPerson
import com.fab.wab.customer.feature.booking.domain.model.NoSlotsReason
import com.fab.wab.customer.feature.booking.domain.repository.AvailabilityRepository
import com.fab.wab.customer.feature.booking.domain.usecase.LoadAvailabilityUseCase
import kotlinx.datetime.LocalDate
import com.fab.wab.customer.core.domain.auth.AuthTokens
import com.fab.wab.customer.core.domain.salon.Audience
import com.fab.wab.customer.core.domain.salon.BusinessType
import com.fab.wab.customer.core.domain.salon.RatingSummary
import com.fab.wab.customer.core.domain.salon.ReviewsPreview
import com.fab.wab.customer.core.domain.salon.SalonDetails
import com.fab.wab.customer.core.domain.salon.SalonService
import com.fab.wab.customer.core.domain.salon.StaffMember
import com.fab.wab.customer.core.domain.salon.StaffPreview
import com.fab.wab.customer.core.domain.salon.StaffStatus
import com.fab.wab.customer.feature.booking.domain.model.StaffChoice
import com.fab.wab.customer.core.domain.session.Gender
import com.fab.wab.customer.core.domain.session.GuestProfile
import com.fab.wab.customer.core.domain.session.SessionState
import com.fab.wab.customer.core.domain.session.SessionStore
import com.fab.wab.customer.core.domain.session.UserProfile
import com.fab.wab.customer.feature.booking.presentation.controller.contract.BookingFlowContract.SideEffect
import com.fab.wab.customer.feature.booking.presentation.controller.contract.BookingFlowContract.UiAction
import com.fab.wab.customer.feature.booking.presentation.controller.contract.BookingStep
import com.fab.wab.customer.feature.booking.presentation.controller.vm.BookingFlowDependencies
import com.fab.wab.customer.feature.booking.presentation.controller.vm.BookingFlowViewModel
import com.fab.wab.customer.feature.salon.domain.repository.SalonDetailsRepository
import kotlinx.coroutines.ExperimentalCoroutinesApi
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.launch
import kotlinx.coroutines.test.TestScope
import kotlinx.coroutines.test.UnconfinedTestDispatcher
import kotlinx.coroutines.test.runTest
import com.fab.wab.customer.core.domain.upload.PresignedUpload
import com.fab.wab.customer.core.domain.upload.UploadsRepository
import com.fab.wab.customer.core.ui.media.FakeImagePicker
import com.fab.wab.customer.core.ui.media.PickResult
import com.fab.wab.customer.feature.booking.domain.usecase.UploadReferenceImageUseCase
import kotlin.test.Test
import kotlin.test.assertEquals
import kotlin.test.assertFalse
import kotlin.test.assertTrue

fun service(id: String, price: String, minutes: Int) = SalonService(id, "c$id", id, null, null, price, minutes, emptyList())

fun salon(gender: Gender) = SalonDetails(
    id = "s1", name = "Glow", businessType = BusinessType.SALON, audience = Audience.fromCode(gender.code), coverUrl = null,
    profileImageUrl = null, description = null, locationText = null,
    location = null, phone = null, whatsapp = null, rating = RatingSummary(4f, 1), isOpenNow = true, todayHours = null, closedReason = null,
    weeklySchedule = emptyList(), upcomingClosures = emptyList(),
    staff = listOf(StaffPreview("m1", "Omar", null, StaffStatus.ON_DUTY), StaffPreview("m2", "Ali", null, StaffStatus.ON_DUTY)),
    services = listOf(service("a", "10", 30), service("b", "5.5", 15)), gallery = emptyList(), isFavorite = false,
    reviews = ReviewsPreview(RatingSummary(4f, 1), emptyList()),
)

class SalonFake(val gender: Gender, val details: SalonDetails = salon(gender)) : SalonDetailsRepository {
    override suspend fun details(salonId: String): AppResult<SalonDetails> = AppResult.Success(details)
    override suspend fun staffMember(salonId: String, memberId: String): AppResult<StaffMember> = AppResult.Loading
}

class SessionFake(initial: SessionState) : SessionStore {
    override val state: Flow<SessionState> = MutableStateFlow(initial)
    override val onboardingSeen: Flow<Boolean> = MutableStateFlow(true)
    override val pushEnabled: Flow<Boolean> = MutableStateFlow(true)
    override suspend fun tokens(): AuthTokens? = null
    override suspend fun signIn(tokens: AuthTokens, user: UserProfile) = Unit
    override suspend fun updateTokens(tokens: AuthTokens) = Unit
    override suspend fun updateUser(user: UserProfile) = Unit
    override suspend fun setOnboardingSeen(seen: Boolean) = Unit
    override suspend fun setGuestProfile(profile: GuestProfile) = Unit
    override suspend fun setPushEnabled(enabled: Boolean) = Unit
    override suspend fun signOut() = Unit
    override suspend fun clearAll() = Unit
}

val USER = SessionState.SignedIn(UserProfile("c1", "Sara", Gender.FEMALE))
val TODAY = LocalDate.parse("2026-10-19")

val DEFAULT_ALLOWED = setOf(PaymentMethod.PAY_ON_ARRIVAL, PaymentMethod.DEPOSIT, PaymentMethod.FULL_ONLINE)

class DraftFake(val allowed: Set<PaymentMethod> = DEFAULT_ALLOWED) : BookingDraftRepository {
    val created = mutableListOf<PaymentMethod>()
    val branches = mutableListOf<String?>()
    val deleted = mutableListOf<String>()
    val sentPersons = mutableListOf<List<DraftPerson>>()
    override suspend fun create(
        salonId: String,
        branchId: String?,
        paymentMethod: PaymentMethod,
        persons: List<DraftPerson>,
    ): AppResult<BookingDraft> {
        created += paymentMethod
        sentPersons += listOf(persons)
        branches += branchId
        if (paymentMethod !in allowed) {
            return AppResult.Error(AppError.ServerError(ErrorCode.PAYMENT_OPTION_NOT_ALLOWED, 422, null))
        }
        val policy = DraftPolicy(3.0, allowed.toList(), 20.0, false, null)
        val deposit = if (paymentMethod == PaymentMethod.DEPOSIT) "2" else "0"
        val money = DraftMoney("10", deposit, deposit, "8")
        val draft = BookingDraft("d${created.size}", salonId, "Glow", "2026-10-19T10:10:00Z", paymentMethod, emptyList(), money, policy)
        return AppResult.Success(draft)
    }
    override suspend fun get(draftId: String): AppResult<BookingDraft> = AppResult.Loading
    override suspend fun verifyOtp(draftId: String, otpToken: String): AppResult<String> = AppResult.Loading
    override suspend fun createBooking(draftId: String): AppResult<CreatedBooking> = AppResult.Loading
    override suspend fun delete(draftId: String): AppResult<Unit> {
        deleted += draftId
        return AppResult.Success(Unit)
    }
}

class AvailabilityFake : AvailabilityRepository {
    val calls = mutableListOf<Pair<String, List<DraftPerson>>>()
    val branches = mutableListOf<String?>()
    override suspend fun slots(
        salonId: String,
        branchId: String?,
        date: String,
        person: DraftPerson,
        others: List<DraftPerson>,
        draftId: String?,
    ): AppResult<DayAvailability> {
        calls += date to others
        branches += branchId
        val slots = listOf(
            AvailabilitySlot("${date}T07:00:00Z", "${date}T07:45:00Z", true, listOf("m1")),
            AvailabilitySlot("${date}T07:15:00Z", "${date}T08:00:00Z", false, emptyList()),
        )
        return AppResult.Success(DayAvailability(date, NoSlotsReason.NONE, 45, slots))
    }
}


/** Presign → upload → confirm always succeed unless [fail]; the key is `ref-<n>`. */
class UploadsFake(var fail: Boolean = false) : UploadsRepository {
    val purposes = mutableListOf<String>()
    override suspend fun presign(purpose: String, contentType: String, size: Int): AppResult<PresignedUpload> {
        purposes += purpose
        if (fail) return AppResult.Error(AppError.NetworkError("offline"))
        return AppResult.Success(PresignedUpload("ref-${purposes.size}", "u", "PUT", emptyMap(), Long.MAX_VALUE))
    }
    override suspend fun upload(target: PresignedUpload, bytes: ByteArray, contentType: String): AppResult<Unit> = AppResult.Success(Unit)
    override suspend fun confirm(key: String): AppResult<String?> = AppResult.Success(null)
}

@OptIn(ExperimentalCoroutinesApi::class)
abstract class BookingFlowHarness {
    val effects = mutableListOf<SideEffect>()
    val availability = AvailabilityFake()
    var drafts = DraftFake()
    val picker = FakeImagePicker()
    val uploads = UploadsFake()

    fun TestScope.viewModel(
        gender: Gender = Gender.FEMALE,
        details: SalonDetails = salon(gender),
        branchId: String? = null,
    ): BookingFlowViewModel {
        val deps = BookingFlowDependencies(
            salonDetails = SalonFake(gender, details),
            sessionStore = SessionFake(USER),
            loadAvailability = LoadAvailabilityUseCase(availability),
            createDraft = CreateBookingDraftUseCase(drafts),
            deleteDraft = DeleteBookingDraftUseCase(drafts),
            analytics = NoOpAnalyticsTracker,
            imagePicker = picker,
            uploadReference = UploadReferenceImageUseCase(uploads),
            errorText = { "error" },
            pickText = { if (it == PickResult.Cancelled) null else "pick failed" },
            today = { TODAY },
        )
        val vm = BookingFlowViewModel("s1", deps, initialBranchId = branchId, testScope = backgroundScope)
        backgroundScope.launch { vm.state.collect {} }
        backgroundScope.launch { vm.sideEffect.collect { effects += it } }
        return vm
    }

    fun BookingFlowViewModel.reachStaffStep() {
        onEvent(UiAction.OnContinue)
        onEvent(UiAction.OnServiceToggle("a"))
        onEvent(UiAction.OnContinue)
        onEvent(UiAction.OnDateSelect(LocalDate.parse("2026-10-20")))
        onEvent(UiAction.OnSlotSelect("2026-10-20T07:00:00Z"))
        onEvent(UiAction.OnContinue)
    }
}
