package com.fab.wab.merchant.feature.bookings.presentation.controller.contract

import com.fab.wab.merchant.core.common.FormValidators
import com.fab.wab.merchant.core.domain.locations.Country
import com.fab.wab.merchant.designsystem.components.upload.MediaPickAction
import com.fab.wab.merchant.designsystem.components.upload.MediaPickUi
import com.fab.wab.merchant.designsystem.components.upload.UploadItemUi
import com.fab.wab.merchant.designsystem.components.upload.UploadStatus
import com.fab.wab.merchant.feature.bookings.domain.model.CustomerGender
import com.fab.wab.merchant.feature.bookings.domain.model.CustomerLookup
import com.fab.wab.merchant.feature.bookings.domain.model.NewBookingRules
import com.fab.wab.merchant.feature.bookings.domain.model.SalonServiceOption
import com.fab.wab.merchant.feature.bookings.domain.model.StaffRef
import kotlinx.datetime.LocalDate

/** What the form still misses (shown after a first Confirm). */
enum class NewBookingField { PHONE, NAME, GENDER, SERVICES, TIME }

/** The customer step: nothing checked yet, the lookup running, or answered ([NewBookingContract.UiState.lookup]). */
enum class LookupStatus { IDLE, CHECKING, DONE }

sealed interface NewBookingContract {
    /**
     * BUSINESS_DOMAIN §5.20 "New booking": phone → lookup (registered: first name shown; not registered: name + gender),
     * then services, staff ("any available" = null), date + 15-minute start and, for a tattoo studio, a design image.
     */
    data class UiState(
        val loading: Boolean = true,
        val loadError: String? = null,
        val countries: List<Country> = emptyList(),
        val countryCode: String = "",
        val number: String = "",
        val countryPickerOpen: Boolean = false,
        val lookupStatus: LookupStatus = LookupStatus.IDLE,
        val lookup: CustomerLookup? = null,
        val name: String = "",
        val gender: CustomerGender? = null,
        val services: List<SalonServiceOption> = emptyList(),
        val selectedServiceIds: Set<String> = emptySet(),
        val staff: List<StaffRef> = emptyList(),
        val staffId: String? = null,
        val today: LocalDate? = null,
        val date: LocalDate? = null,
        val nowMinute: Int = 0,
        val minuteOfDay: Int? = null,
        val datePickerOpen: Boolean = false,
        val isTattoo: Boolean = false,
        val design: UploadItemUi? = null,
        val designKey: String? = null,
        val media: MediaPickUi = MediaPickUi(),
        val showErrors: Boolean = false,
        val submitting: Boolean = false,
    ) {
        val country: Country? get() = countries.firstOrNull { it.code == countryCode }
        val phoneValid: Boolean get() = country?.let { FormValidators.isValidPhone(number, it.phoneRegex) } == true
        val customerChecked: Boolean get() = lookupStatus == LookupStatus.DONE
        val isRegistered: Boolean get() = lookup?.registered == true

        /** A registered customer brings the name from the account; a blocked one (no name) or a new number types it. */
        val asksName: Boolean get() = customerChecked && (!isRegistered || lookup?.firstName == null)
        val asksGender: Boolean get() = customerChecked && !isRegistered
        val personName: String get() = if (asksName) name.trim() else lookup?.firstName.orEmpty()
        val personGender: CustomerGender? get() = if (isRegistered) lookup?.gender else gender

        val selectedServices: List<SalonServiceOption> get() = services.filter { it.id in selectedServiceIds }
        val totalMinutes: Int get() = NewBookingRules.totalMinutes(selectedServices)
        val totalFils: Long get() = NewBookingRules.totalFils(selectedServices)

        /** Start times of the chosen day; today only those still ahead. */
        val slotMinutes: List<Int> get() = NewBookingRules.slotMinutes(if (date != null && date == today) nowMinute else null)
        val designUploading: Boolean get() = design?.status is UploadStatus.Uploading

        val errors: Set<NewBookingField>
            get() = buildSet {
                if (!customerChecked) add(NewBookingField.PHONE)
                if (asksName && name.isBlank()) add(NewBookingField.NAME)
                if (asksGender && gender == null) add(NewBookingField.GENDER)
                if (selectedServiceIds.isEmpty()) add(NewBookingField.SERVICES)
                if (date == null || minuteOfDay == null || minuteOfDay !in slotMinutes) add(NewBookingField.TIME)
            }

        val visibleErrors: Set<NewBookingField> get() = if (showErrors) errors else emptySet()
        val canCheck: Boolean get() = phoneValid && lookupStatus != LookupStatus.CHECKING
        val canSubmit: Boolean get() = customerChecked && !submitting && !designUploading
    }

    sealed interface UiAction {
        data class OnNumber(val value: String) : UiAction
        data object OnCountryClick : UiAction
        data class OnCountrySelect(val code: String) : UiAction
        data object OnCountryDismiss : UiAction
        data object OnCheck : UiAction
        data class OnName(val value: String) : UiAction
        data class OnGender(val gender: CustomerGender) : UiAction
        data class OnServiceToggle(val id: String) : UiAction

        /** null = "Any available". */
        data class OnStaff(val staffId: String?) : UiAction
        data object OnDateClick : UiAction
        data object OnDateDismiss : UiAction
        data class OnDateSelect(val date: LocalDate) : UiAction
        data class OnTimeSelect(val minuteOfDay: Int) : UiAction
        data object OnPickDesign : UiAction
        data object OnRemoveDesign : UiAction
        data class OnMedia(val action: MediaPickAction) : UiAction
        data object OnSubmit : UiAction
        data object OnRetry : UiAction
    }

    sealed interface SideEffect {
        /** The booking was created: open its details with the success message. */
        data class OpenBooking(val id: String) : SideEffect
        data class ShowError(val message: String) : SideEffect
    }
}
