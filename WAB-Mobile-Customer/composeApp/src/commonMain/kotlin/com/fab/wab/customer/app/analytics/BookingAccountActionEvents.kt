package com.fab.wab.customer.app.analytics
import com.fab.wab.customer.app.analytics.AnalyticsCatalog.Events
import com.fab.wab.customer.feature.auth.presentation.controller.contract.LoginContract
import com.fab.wab.customer.feature.auth.presentation.controller.contract.OtpContract
import com.fab.wab.customer.feature.auth.presentation.controller.contract.RegisterContract
import com.fab.wab.customer.feature.booking.presentation.controller.contract.BookingFlowContract
import com.fab.wab.customer.feature.booking.presentation.controller.contract.BookingSuccessContract
import com.fab.wab.customer.feature.bookings.presentation.controller.contract.BookingDetailsContract
import com.fab.wab.customer.feature.bookings.presentation.controller.contract.BookingsContract
import com.fab.wab.customer.feature.bookings.presentation.controller.contract.RatingContract
import com.fab.wab.customer.feature.content.presentation.controller.contract.ContentPageContract
import com.fab.wab.customer.feature.content.presentation.controller.contract.FaqContract
import com.fab.wab.customer.feature.favorites.presentation.controller.contract.FavoritesContract
import com.fab.wab.customer.feature.home.presentation.controller.contract.HomeContract
import com.fab.wab.customer.feature.notifications.presentation.controller.contract.NotificationsContract
import com.fab.wab.customer.feature.onboarding.presentation.controller.contract.GuestProfileContract
import com.fab.wab.customer.feature.onboarding.presentation.controller.contract.OnboardingContract
import com.fab.wab.customer.feature.profile.presentation.controller.contract.EditProfileContract
import com.fab.wab.customer.feature.profile.presentation.controller.contract.ProfileContract
import com.fab.wab.customer.feature.salon.presentation.controller.contract.ReviewsContract
import com.fab.wab.customer.feature.salon.presentation.controller.contract.SalonDetailsContract
import com.fab.wab.customer.feature.salon.presentation.controller.contract.StaffSheetContract
import com.fab.wab.customer.feature.salons.presentation.controller.contract.AllSalonsContract

/** Per-feature classification of `UiAction`s (exhaustive `when` per contract; see [AnalyticsCatalog]). */
internal object BookingAccountActionEvents {
    fun bookings(a: BookingsContract.UiAction): ActionEvent = when (a) {
        is BookingsContract.UiAction.OnTabSelect, is BookingsContract.UiAction.OnQueryChange, is BookingsContract.UiAction.OnBookingClick,
        -> ActionEvent.ByViewModel
        BookingsContract.UiAction.OnLoginClick -> ActionEvent.Named(Events.LOGIN_OPEN)
        BookingsContract.UiAction.OnBookNowClick -> ActionEvent.Named(Events.BOOK_NOW_CLICK)
        BookingsContract.UiAction.OnLoadMore, BookingsContract.UiAction.OnRefresh, BookingsContract.UiAction.OnRetry,
        BookingsContract.UiAction.OnResume, -> ActionEvent.Silent
    }
    fun bookingDetails(a: BookingDetailsContract.UiAction): ActionEvent = when (a) {
        BookingDetailsContract.UiAction.OnCancelConfirm -> ActionEvent.ByViewModel
        BookingDetailsContract.UiAction.OnCallClick -> ActionEvent.Named(Events.CALL_SALON)
        BookingDetailsContract.UiAction.OnWhatsAppClick -> ActionEvent.Named(Events.WHATSAPP_SALON)
        BookingDetailsContract.UiAction.OnRateClick -> ActionEvent.Named(Events.RATE_OPEN)
        BookingDetailsContract.UiAction.OnCancelClick -> ActionEvent.Named(Events.BOOKING_CANCEL_START)
        BookingDetailsContract.UiAction.OnRetry, BookingDetailsContract.UiAction.OnRefresh, BookingDetailsContract.UiAction.OnResume,
        BookingDetailsContract.UiAction.OnCancelDismiss, -> ActionEvent.Silent
    }
    fun rating(a: RatingContract.UiAction): ActionEvent = when (a) {
        RatingContract.UiAction.OnSubmit, RatingContract.UiAction.OnSkip -> ActionEvent.ByViewModel
        RatingContract.UiAction.OnDone -> ActionEvent.Named(Events.RATING_DONE)
        RatingContract.UiAction.OnRetry, is RatingContract.UiAction.OnRatingChange, is RatingContract.UiAction.OnCommentChange,
        -> ActionEvent.Silent
    }
    fun bookingFlow(a: BookingFlowContract.UiAction): ActionEvent = when (a) {
        BookingFlowContract.UiAction.OnContinue, BookingFlowContract.UiAction.OnJustMe, is BookingFlowContract.UiAction.OnServiceToggle,
        is BookingFlowContract.UiAction.OnPaymentMethodSelect, -> ActionEvent.ByViewModel
        BookingFlowContract.UiAction.OnConfirm -> ActionEvent.Named(Events.BOOKING_SUBMIT)
        is BookingFlowContract.UiAction.OnDateSelect -> ActionEvent.Named(Events.BOOKING_DATE_SELECT)
        is BookingFlowContract.UiAction.OnSlotSelect -> ActionEvent.Named(Events.BOOKING_SLOT_SELECT)
        BookingFlowContract.UiAction.OnAnyStaffSelect, is BookingFlowContract.UiAction.OnStaffSelect -> ActionEvent.Named(
            Events.BOOKING_STAFF_SELECT,
        )
        BookingFlowContract.UiAction.OnAddCompanion -> ActionEvent.Named(Events.BOOKING_COMPANION_ADD)
        is BookingFlowContract.UiAction.OnRemovePerson -> ActionEvent.Named(Events.BOOKING_COMPANION_REMOVE)
        is BookingFlowContract.UiAction.OnBrideChange -> ActionEvent.Named(Events.BOOKING_BRIDE_TOGGLE)
        BookingFlowContract.UiAction.OnBack -> ActionEvent.Named(Events.BOOKING_BACK)
        BookingFlowContract.UiAction.OnRetry, is BookingFlowContract.UiAction.OnNameChange, is BookingFlowContract.UiAction.OnMonthChange,
        -> ActionEvent.Silent
    }
    fun notifications(a: NotificationsContract.UiAction): ActionEvent = when (a) {
        is NotificationsContract.UiAction.OnItemClick, NotificationsContract.UiAction.OnViewBooking,
        NotificationsContract.UiAction.OnApplyFilters,
        NotificationsContract.UiAction.OnResetFilters, -> ActionEvent.ByViewModel
        NotificationsContract.UiAction.OnFilterClick -> ActionEvent.Named(Events.FILTER_OPEN)
        is NotificationsContract.UiAction.OnChipRemove -> ActionEvent.Named(Events.FILTER_CHIP_REMOVE)
        NotificationsContract.UiAction.OnRefresh, NotificationsContract.UiAction.OnResume, NotificationsContract.UiAction.OnRetry,
        NotificationsContract.UiAction.OnLoadMore, is NotificationsContract.UiAction.OnVisible,
        NotificationsContract.UiAction.OnPopupDismiss,
        NotificationsContract.UiAction.OnSheetDismiss, is NotificationsContract.UiAction.OnDraftFromChange,
        is NotificationsContract.UiAction.OnDraftToChange, is NotificationsContract.UiAction.OnDraftQueryChange, -> ActionEvent.Silent
    }
    fun profile(a: ProfileContract.UiAction): ActionEvent = when (a) {
        ProfileContract.UiAction.OnGuestSave, is ProfileContract.UiAction.OnPhotoSourceSelect, ProfileContract.UiAction.OnPhotoDelete,
        is ProfileContract.UiAction.OnLanguageSelect, is ProfileContract.UiAction.OnThemeSelect, is ProfileContract.UiAction.OnPushToggle,
        is ProfileContract.UiAction.OnContactChannel, is ProfileContract.UiAction.OnLinkClick, ProfileContract.UiAction.OnLogoutConfirm,
        ProfileContract.UiAction.OnDeleteAccountConfirm, -> ActionEvent.ByViewModel
        ProfileContract.UiAction.OnLoginClick -> ActionEvent.Named(Events.LOGIN_OPEN)
        ProfileContract.UiAction.OnEditGuestClick, ProfileContract.UiAction.OnPhotoClick, ProfileContract.UiAction.OnLanguageClick,
        ProfileContract.UiAction.OnThemeClick, ProfileContract.UiAction.OnContactClick, ProfileContract.UiAction.OnLogoutClick,
        ProfileContract.UiAction.OnDeleteAccountClick, -> ActionEvent.Named(Events.PROFILE_SHEET_OPEN)
        ProfileContract.UiAction.OnResume, ProfileContract.UiAction.OnRetryAccount, is ProfileContract.UiAction.OnGuestNicknameChange,
        is ProfileContract.UiAction.OnGuestGenderSelect, ProfileContract.UiAction.OnOverlayDismiss, -> ActionEvent.Silent
    }
    fun editProfile(a: EditProfileContract.UiAction): ActionEvent = when (a) {
        EditProfileContract.UiAction.OnSaveClick -> ActionEvent.ByViewModel
        is EditProfileContract.UiAction.OnCountrySelect -> ActionEvent.Named(Events.COUNTRY_SELECT)
        is EditProfileContract.UiAction.OnGenderSelect, is EditProfileContract.UiAction.OnCitySelect,
        is EditProfileContract.UiAction.OnAreaSelect,
        -> ActionEvent.Named(Events.REGISTER_FIELD_SELECT)
        is EditProfileContract.UiAction.OnFirstNameChange, is EditProfileContract.UiAction.OnLastNameChange,
        is EditProfileContract.UiAction.OnEmailChange, is EditProfileContract.UiAction.OnNumberChange,
        EditProfileContract.UiAction.OnCountryClick,
        EditProfileContract.UiAction.OnPickerDismiss, EditProfileContract.UiAction.OnRetryLoad, -> ActionEvent.Silent
    }
    fun content(a: Any): ActionEvent = when (a) {
        is ContentPageContract.UiAction.OnLinkClick, is ContentPageContract.UiAction.OnContactChannel, is FaqContract.UiAction.OnToggle,
        -> ActionEvent.ByViewModel
        else -> ActionEvent.Silent
    }
}
