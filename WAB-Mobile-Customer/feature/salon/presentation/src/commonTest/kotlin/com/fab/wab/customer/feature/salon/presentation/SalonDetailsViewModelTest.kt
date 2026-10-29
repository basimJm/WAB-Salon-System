package com.fab.wab.customer.feature.salon.presentation

import com.fab.wab.customer.core.domain.salon.Audience
import com.fab.wab.customer.core.domain.salon.BusinessType
import com.fab.wab.customer.core.analytics.NoOpAnalyticsTracker
import com.fab.wab.customer.core.domain.AppError
import com.fab.wab.customer.core.domain.AppResult
import com.fab.wab.customer.core.domain.ErrorCode
import com.fab.wab.customer.core.domain.auth.AuthTokens
import com.fab.wab.customer.core.domain.favorites.FavoritesRepository
import com.fab.wab.customer.core.domain.model.LocationData
import com.fab.wab.customer.core.domain.salon.RatingSummary
import com.fab.wab.customer.core.domain.salon.ReviewsPreview
import com.fab.wab.customer.core.domain.salon.SalonBranch
import com.fab.wab.customer.core.domain.salon.SalonDetails
import com.fab.wab.customer.core.domain.salon.SalonService
import com.fab.wab.customer.core.domain.salon.SalonSummary
import com.fab.wab.customer.core.domain.salon.StaffMember
import com.fab.wab.customer.core.domain.salon.StaffPreview
import com.fab.wab.customer.core.domain.salon.StaffStatus
import com.fab.wab.customer.core.domain.session.Gender
import com.fab.wab.customer.core.domain.session.GuestProfile
import com.fab.wab.customer.core.domain.session.SessionState
import com.fab.wab.customer.core.domain.session.SessionStore
import com.fab.wab.customer.core.domain.session.UserProfile
import com.fab.wab.customer.core.ui.external.ExternalApp
import com.fab.wab.customer.core.ui.external.FakeExternalActions
import com.fab.wab.customer.feature.salon.domain.repository.SalonDetailsRepository
import com.fab.wab.customer.feature.salon.domain.usecase.GetSalonDetailsUseCase
import com.fab.wab.customer.feature.salon.presentation.controller.contract.SalonDetailsContract.SalonDialog
import com.fab.wab.customer.feature.salon.presentation.controller.contract.SalonDetailsContract.SideEffect
import com.fab.wab.customer.feature.salon.presentation.controller.contract.SalonDetailsContract.UiAction
import com.fab.wab.customer.feature.salon.presentation.controller.vm.SalonDetailsDependencies
import com.fab.wab.customer.feature.salon.presentation.controller.vm.SalonDetailsViewModel
import com.fab.wab.customer.feature.salon.presentation.controller.vm.shareText
import kotlinx.coroutines.ExperimentalCoroutinesApi
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.launch
import kotlinx.coroutines.test.TestScope
import kotlinx.coroutines.test.UnconfinedTestDispatcher
import kotlinx.coroutines.test.runTest
import kotlin.test.Test
import kotlin.test.assertEquals
import kotlin.test.assertNull
import kotlin.test.assertIs
import kotlin.test.assertTrue

private val SALON = SalonDetails(
    id = "s1", name = "Glow", businessType = BusinessType.SALON, audience = Audience.FEMALE, coverUrl = null, profileImageUrl = null, description = null,
    locationText = "Amman", location = LocationData(31.9, 35.9), phone = "+962791234567", whatsapp = "+962791234567",
    rating = RatingSummary(4.5f, 12), isOpenNow = false, todayHours = null, closedReason = null,
    weeklySchedule = emptyList(), upcomingClosures = emptyList(), staff = emptyList(), services = emptyList(),
    gallery = emptyList(), isFavorite = false, reviews = ReviewsPreview(RatingSummary(4.5f, 12), emptyList()),
)

private class DetailsFake(var result: AppResult<SalonDetails> = AppResult.Success(SALON)) : SalonDetailsRepository {
    override suspend fun details(salonId: String): AppResult<SalonDetails> = result
    override suspend fun staffMember(salonId: String, memberId: String): AppResult<StaffMember> = AppResult.Loading
}

private class FavoritesFake(var result: AppResult<Boolean>? = null) : FavoritesRepository {
    val calls = mutableListOf<Pair<String, Boolean>>()
    override suspend fun setFavorite(salonId: String, favorite: Boolean): AppResult<Boolean> {
        calls += salonId to favorite
        return result ?: AppResult.Success(favorite)
    }
    override suspend fun list(page: Int, pageSize: Int): AppResult<List<SalonSummary>> = AppResult.Success(emptyList())
}

private class DetailsSessionFake(initial: SessionState) : SessionStore {
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

private val GUEST = SessionState.Guest(GuestProfile("Sara", Gender.FEMALE))
private val USER = SessionState.SignedIn(UserProfile("c1", "Omar", Gender.MALE))
private const val WEB = "https://example.invalid"

@OptIn(ExperimentalCoroutinesApi::class)
class SalonDetailsViewModelTest {

    private val details = DetailsFake()
    private val favorites = FavoritesFake()
    private val external = FakeExternalActions()
    private val effects = mutableListOf<SideEffect>()

    private fun TestScope.viewModel(session: SessionState = GUEST, branchId: String? = null): SalonDetailsViewModel {
        val deps = SalonDetailsDependencies(
            getSalonDetails = GetSalonDetailsUseCase(details),
            favorites = favorites,
            sessionStore = DetailsSessionFake(session),
            external = external,
            analytics = NoOpAnalyticsTracker,
            webBaseUrl = WEB,
            errorText = { "error" },
            externalText = { app -> "unavailable:$app" },
        )
        val vm = SalonDetailsViewModel("s1", deps, initialBranchId = branchId, testScope = backgroundScope)
        backgroundScope.launch { vm.state.collect {} }
        backgroundScope.launch { vm.sideEffect.collect { effects += it } }
        return vm
    }

    @Test
    fun loadsAndHandsOffToMapsDialerWhatsAppAndShare() = runTest(UnconfinedTestDispatcher()) {
        val vm = viewModel()
        assertEquals(SALON, vm.state.value.salon)
        vm.onEvent(UiAction.OnLocationClick)
        vm.onEvent(UiAction.OnCallClick)
        vm.onEvent(UiAction.OnWhatsAppClick)
        vm.onEvent(UiAction.OnShareClick)
        val share = "share:" + shareText("Glow", "$WEB/salon/s1")
        assertEquals(listOf("maps:31.9,35.9:Glow", "tel:+962791234567", "https://wa.me/962791234567", share), external.calls)
    }

    @Test
    fun aDeviceWithoutDialerOrMapsShowsAMessageInsteadOfNothing() = runTest(UnconfinedTestDispatcher()) {
        external.unavailable = setOf(ExternalApp.DIALER, ExternalApp.MAPS)
        val vm = viewModel()
        vm.onEvent(UiAction.OnCallClick)
        vm.onEvent(UiAction.OnLocationClick)
        vm.onEvent(UiAction.OnWhatsAppClick)
        assertEquals(
            listOf<SideEffect>(SideEffect.ShowError("unavailable:DIALER"), SideEffect.ShowError("unavailable:MAPS")),
            effects.filterIsInstance<SideEffect.ShowError>(),
        )
        assertEquals(3, external.calls.size)
    }

    @Test
    fun bookAndFavoriteAreAuthGatedForGuests() = runTest(UnconfinedTestDispatcher()) {
        val vm = viewModel()
        vm.onEvent(UiAction.OnBookClick)
        assertEquals(SalonDialog.AuthRequired, vm.state.value.dialog)
        vm.onEvent(UiAction.OnDialogConfirm)
        assertEquals(SideEffect.OpenLogin, effects.last())
        vm.onEvent(UiAction.OnFavoriteClick)
        assertEquals(SalonDialog.AuthRequired, vm.state.value.dialog)
        assertTrue(favorites.calls.isEmpty())
    }

    @Test
    fun registeredUserBooksEvenWhenClosedAndTogglesFavoriteOptimistically() = runTest(UnconfinedTestDispatcher()) {
        val vm = viewModel(USER)
        vm.onEvent(UiAction.OnBookClick)
        assertEquals(SideEffect.OpenBooking("s1"), effects.last())
        vm.onEvent(UiAction.OnFavoriteClick)
        assertEquals(listOf("s1" to true), favorites.calls)
        assertEquals(true, vm.state.value.salon?.isFavorite)
        favorites.result = AppResult.Error(AppError.NetworkError("offline"))
        vm.onEvent(UiAction.OnFavoriteClick)
        assertEquals(true, vm.state.value.salon?.isFavorite)
        assertIs<SideEffect.ShowError>(effects.last())
    }

    @Test
    fun hoursToggleAndErrorState() = runTest(UnconfinedTestDispatcher()) {
        details.result = AppResult.Error(AppError.UnknownError("boom"))
        val vm = viewModel()
        assertEquals("error", vm.state.value.error)
        vm.onEvent(UiAction.OnHoursToggle)
        assertTrue(vm.state.value.hoursExpanded)
    }

    @Test
    fun missingSalonEmitsNotAvailableInsteadOfAnErrorState() = runTest(UnconfinedTestDispatcher()) {
        details.result = AppResult.Error(AppError.ServerError(ErrorCode.SALON_NOT_FOUND, HTTP_NOT_FOUND, null))
        val vm = viewModel()
        assertNull(vm.state.value.error)
        assertEquals<SideEffect>(SideEffect.NotAvailable, effects.single())
    }

    @Test
    fun mainBranchIsSelectedFirstAndDrivesPlaceContactsStaffAndServices() = runTest(UnconfinedTestDispatcher()) {
        details.result = AppResult.Success(BRANCHED)
        val vm = viewModel(USER)
        val state = vm.state.value
        assertTrue(state.showBranchSelector)
        assertEquals("main", state.selectedBranchId)
        assertEquals("Abdoun", state.view?.locationText)
        assertEquals(listOf("m1"), state.view?.staff?.map { it.id })
        assertEquals(listOf("sv1"), state.view?.services?.map { it.id })

        vm.onEvent(UiAction.OnBranchSelect("khalda"))
        assertEquals("Khalda", vm.state.value.view?.locationText)
        assertEquals(listOf("sv2"), vm.state.value.view?.services?.map { it.id })
        vm.onEvent(UiAction.OnCallClick)
        vm.onEvent(UiAction.OnLocationClick)
        assertEquals(listOf("tel:+962790000002", "maps:32.0,35.8:Glow - Khalda"), external.calls)
        vm.onEvent(UiAction.OnBookClick)
        assertEquals(SideEffect.OpenBooking("s1", "khalda"), effects.last())
    }

    @Test
    fun requestedBranchIsPreselectedAndKeptAcrossRefresh() = runTest(UnconfinedTestDispatcher()) {
        details.result = AppResult.Success(BRANCHED)
        val vm = viewModel(branchId = "khalda")
        assertEquals("khalda", vm.state.value.selectedBranchId)
        vm.onEvent(UiAction.OnBranchSelect("main"))
        vm.onEvent(UiAction.OnRefresh)
        assertEquals("main", vm.state.value.selectedBranchId)
        vm.onEvent(UiAction.OnBranchSelect("gone"))
        assertEquals("main", vm.state.value.selectedBranchId)
    }

    @Test
    fun unknownRequestedBranchFallsBackToMainAndSingleBranchHidesTheSelector() = runTest(UnconfinedTestDispatcher()) {
        details.result = AppResult.Success(BRANCHED)
        assertEquals("main", viewModel(branchId = "closed").state.value.selectedBranchId)
        details.result = AppResult.Success(BRANCHED.copy(branches = BRANCHED.branches.take(1)))
        val single = viewModel().state.value
        assertEquals(false, single.showBranchSelector)
        assertEquals("main", single.selectedBranchId)
        details.result = AppResult.Success(SALON)
        assertNull(viewModel().state.value.selectedBranchId)
    }
}

private fun branch(id: String, name: String, isMain: Boolean, phone: String, location: LocationData) = SalonBranch(
    id = id, name = name, isMain = isMain, locationText = name, location = location, phone = phone, whatsapp = null,
    isOpenNow = true, todayHours = null, closedReason = null, weeklySchedule = emptyList(), upcomingClosures = emptyList(),
)

private val BRANCHED = SALON.copy(
    branches = listOf(
        branch("main", "Abdoun", isMain = true, phone = "+962790000001", location = LocationData(31.9, 35.9)),
        branch("khalda", "Khalda", isMain = false, phone = "+962790000002", location = LocationData(32.0, 35.8)),
    ),
    staff = listOf(StaffPreview("m1", "Omar", null, StaffStatus.ON_DUTY, branchId = "main")),
    services = listOf(
        SalonService("sv1", "c1", "Cut", null, null, "8", 30, emptyList(), branchId = "main"),
        SalonService("sv2", "c1", "Cut", null, null, "9", 30, emptyList(), branchId = "khalda"),
    ),
)

private const val HTTP_NOT_FOUND = 404
