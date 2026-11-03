package com.fab.wab.merchant.feature.bookings.presentation.controller.vm

import com.fab.wab.merchant.core.analytics.AnalyticsAction
import com.fab.wab.merchant.core.analytics.AnalyticsTracker
import com.fab.wab.merchant.core.common.FormValidators
import com.fab.wab.merchant.core.domain.AppError
import com.fab.wab.merchant.core.domain.AppResult
import com.fab.wab.merchant.core.domain.locations.LocationsRepository
import com.fab.wab.merchant.core.domain.locations.defaultCountry
import com.fab.wab.merchant.core.domain.salon.BusinessKind
import com.fab.wab.merchant.core.domain.upload.LocalFile
import com.fab.wab.merchant.core.domain.upload.UploadKind
import com.fab.wab.merchant.core.domain.upload.UploadProgress
import com.fab.wab.merchant.core.domain.upload.UploadPurpose
import com.fab.wab.merchant.core.mvi.BaseViewModel
import com.fab.wab.merchant.core.ui.media.FilePicker
import com.fab.wab.merchant.designsystem.components.feedback.appErrorText
import com.fab.wab.merchant.designsystem.components.upload.LocalPreview
import com.fab.wab.merchant.designsystem.components.upload.MediaPickHandler
import com.fab.wab.merchant.designsystem.components.upload.PHOTO_SOURCES
import com.fab.wab.merchant.designsystem.components.upload.UploadItemUi
import com.fab.wab.merchant.designsystem.components.upload.UploadStatus
import com.fab.wab.merchant.feature.bookings.domain.model.NewBookingCustomer
import com.fab.wab.merchant.feature.bookings.domain.model.NewBookingPerson
import com.fab.wab.merchant.feature.bookings.domain.model.NewBookingRequest
import com.fab.wab.merchant.feature.bookings.domain.model.NewBookingRules
import com.fab.wab.merchant.feature.bookings.domain.model.PhoneNumber
import com.fab.wab.merchant.feature.bookings.domain.repository.BookingsRepository
import com.fab.wab.merchant.feature.bookings.domain.repository.NewBookingRepository
import com.fab.wab.merchant.feature.bookings.presentation.analytics.BookingsAnalytics
import com.fab.wab.merchant.feature.bookings.presentation.controller.contract.LookupStatus
import com.fab.wab.merchant.feature.bookings.presentation.controller.contract.NewBookingContract.SideEffect
import com.fab.wab.merchant.feature.bookings.presentation.controller.contract.NewBookingContract.UiAction
import com.fab.wab.merchant.feature.bookings.presentation.controller.contract.NewBookingContract.UiState
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.launch
import kotlinx.datetime.DatePeriod
import kotlinx.datetime.LocalDate
import kotlinx.datetime.TimeZone
import kotlinx.datetime.plus

class NewBookingDependencies(
    val repository: NewBookingRepository,
    /** Service providers for the staff choice (`BookingsRepository.staff`). */
    val bookings: BookingsRepository,
    val locations: LocationsRepository,
    /** The owner's chosen branch (`BranchScope.filter`); null for a branch member (the server uses theirs). */
    val branchId: suspend () -> String?,
    /** The salon's type (a tattoo studio offers the design image); null when unknown. */
    val kind: suspend () -> BusinessKind?,
    /** Today and the current minute of the day in Asia/Amman. */
    val today: () -> LocalDate,
    val nowMinute: () -> Int,
    val zone: TimeZone,
    val analytics: AnalyticsTracker,
    val picker: FilePicker,
    val upload: (LocalFile, UploadPurpose) -> Flow<UploadProgress>,
    val errorText: suspend (AppError) -> String = ::appErrorText,
)

private const val DESIGN_ID = "booking-design"

/** BUSINESS_DOMAIN §5.20: a member books for a customer (`BOOKINGS_CREATE`); created APPROVED, pay at the business. */
class NewBookingViewModel(
    private val deps: NewBookingDependencies,
    testScope: CoroutineScope? = null,
) : BaseViewModel<UiState, UiAction, SideEffect>(initialState = UiState(), testScope) {

    private val media = MediaPickHandler(deps.picker, scope, { uiState.value.media }) { updateState { copy(media = it) } }

    override fun onStart() = load()

    override fun handle(event: UiAction) {
        handleCustomer(event) || handleBooking(event) || handleDesign(event)
    }

    private fun handleCustomer(event: UiAction): Boolean {
        when (event) {
            // A changed number or country needs a new check (the answer belonged to the old number).
            is UiAction.OnNumber -> updateState { copy(number = event.value, lookupStatus = LookupStatus.IDLE, lookup = null) }
            UiAction.OnCountryClick -> updateState { copy(countryPickerOpen = true) }
            is UiAction.OnCountrySelect ->
                updateState { copy(countryCode = event.code, countryPickerOpen = false, lookupStatus = LookupStatus.IDLE, lookup = null) }
            UiAction.OnCountryDismiss -> updateState { copy(countryPickerOpen = false) }
            UiAction.OnCheck -> check()
            is UiAction.OnName -> updateState { copy(name = event.value.take(NewBookingRules.NAME_MAX)) }
            is UiAction.OnGender -> updateState { copy(gender = event.gender) }
            else -> return false
        }
        return true
    }

    private fun handleBooking(event: UiAction): Boolean {
        when (event) {
            is UiAction.OnServiceToggle -> updateState {
                copy(selectedServiceIds = if (event.id in selectedServiceIds) selectedServiceIds - event.id else selectedServiceIds + event.id)
            }
            is UiAction.OnStaff -> updateState { copy(staffId = event.staffId) }
            UiAction.OnDateClick -> updateState { copy(datePickerOpen = true) }
            UiAction.OnDateDismiss -> updateState { copy(datePickerOpen = false) }
            is UiAction.OnDateSelect -> selectDate(event.date)
            is UiAction.OnTimeSelect -> updateState { copy(minuteOfDay = event.minuteOfDay) }
            UiAction.OnSubmit -> submit()
            UiAction.OnRetry -> load()
            else -> return false
        }
        return true
    }

    private fun handleDesign(event: UiAction): Boolean {
        when (event) {
            UiAction.OnPickDesign -> media.open(PHOTO_SOURCES, maxCount = 1) { files ->
                files.firstOrNull()?.let { uploadDesign(LocalFile(DESIGN_ID, it.name, it.bytes, it.contentType)) }
            }
            UiAction.OnRemoveDesign -> updateState { copy(design = null, designKey = null) }
            is UiAction.OnMedia -> media.handle(event.action)
            else -> return false
        }
        return true
    }

    private fun load() {
        scope.launch {
            val today = deps.today()
            updateState { copy(loading = true, loadError = null, today = today, date = date ?: today, nowMinute = deps.nowMinute()) }
            val countries = (deps.locations.countries() as? AppResult.Success)?.data.orEmpty()
            val staff = (deps.bookings.staff() as? AppResult.Success)?.data.orEmpty()
            val tattoo = deps.kind()?.isTattoo == true
            when (val services = deps.repository.services()) {
                is AppResult.Success -> updateState {
                    copy(
                        loading = false,
                        countries = countries,
                        countryCode = countryCode.ifEmpty { countries.defaultCountry()?.code.orEmpty() },
                        services = services.data,
                        staff = staff,
                        isTattoo = tattoo,
                    )
                }
                is AppResult.Error -> {
                    val message = deps.errorText(services.appError)
                    updateState { copy(loading = false, loadError = message) }
                }
                AppResult.Loading -> Unit
            }
        }
    }

    private fun phone(state: UiState): PhoneNumber = PhoneNumber(state.countryCode, FormValidators.normalizeNationalNumber(state.number))

    private fun check() {
        val state = uiState.value
        if (!state.canCheck) return
        val asked = phone(state)
        scope.launch {
            updateState { copy(lookupStatus = LookupStatus.CHECKING) }
            when (val result = deps.repository.lookup(asked)) {
                is AppResult.Success -> {
                    // The number may have changed while the lookup ran: that answer is dropped.
                    if (phone(uiState.value) == asked) updateState { copy(lookupStatus = LookupStatus.DONE, lookup = result.data) }
                }
                is AppResult.Error -> {
                    updateState { copy(lookupStatus = LookupStatus.IDLE) }
                    emitSideEffect(SideEffect.ShowError(deps.errorText(result.appError)))
                }
                AppResult.Loading -> Unit
            }
        }
    }

    /** Today .. today + 90 days (§5.4); another day keeps the current choice. */
    private fun selectDate(date: LocalDate) {
        val today = uiState.value.today ?: deps.today()
        if (date < today || date > today.plus(DatePeriod(days = NewBookingRules.MAX_DAYS_AHEAD))) {
            updateState { copy(datePickerOpen = false) }
            return
        }
        updateState { copy(date = date, datePickerOpen = false, nowMinute = deps.nowMinute()) }
    }

    private fun uploadDesign(file: LocalFile) {
        scope.launch {
            deps.upload(file, UploadPurpose.BOOKING_REFERENCE).collect { progress ->
                val status = when (progress) {
                    is UploadProgress.Uploading -> UploadStatus.Uploading(progress.fraction)
                    is UploadProgress.Done -> UploadStatus.Uploaded
                    is UploadProgress.Failed -> UploadStatus.Failed
                }
                updateState { copy(design = UploadItemUi(DESIGN_ID, file.name, UploadKind.IMAGE, status, preview = LocalPreview(file.bytes))) }
                when (progress) {
                    is UploadProgress.Done -> updateState { copy(designKey = progress.upload.key) }
                    is UploadProgress.Failed -> emitSideEffect(SideEffect.ShowError(deps.errorText(progress.error)))
                    is UploadProgress.Uploading -> Unit
                }
            }
        }
    }

    private fun submit() {
        val state = uiState.value
        if (!state.canSubmit) return
        val date = state.date
        val minute = state.minuteOfDay
        if (state.errors.isNotEmpty() || date == null || minute == null) {
            updateState { copy(showErrors = true) }
            return
        }
        scope.launch {
            updateState { copy(submitting = true) }
            val request = NewBookingRequest(
                branchId = deps.branchId(),
                customer = NewBookingCustomer(
                    phone = phone(state),
                    name = state.name.takeIf { !state.isRegistered },
                    gender = state.gender.takeIf { !state.isRegistered },
                ),
                persons = listOf(
                    NewBookingPerson(
                        name = state.personName,
                        gender = state.personGender,
                        serviceIds = state.selectedServices.map { it.id },
                        staffId = state.staffId,
                        start = NewBookingRules.slotStart(date, minute, deps.zone),
                        referenceImageKey = state.designKey.takeIf { state.isTattoo },
                    ),
                ),
            )
            when (val result = deps.repository.create(request)) {
                is AppResult.Success -> {
                    updateState { copy(submitting = false) }
                    deps.analytics.trackAction(AnalyticsAction(BookingsAnalytics.ACTION_CREATE))
                    emitSideEffect(SideEffect.OpenBooking(result.data.id))
                }
                is AppResult.Error -> {
                    updateState { copy(submitting = false) }
                    emitSideEffect(SideEffect.ShowError(deps.errorText(result.appError)))
                }
                AppResult.Loading -> Unit
            }
        }
    }
}
