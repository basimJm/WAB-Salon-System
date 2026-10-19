package com.fab.wab.customer.app.analytics

import com.fab.wab.customer.core.analytics.AnalyticsScreenNames
import com.fab.wab.customer.core.navigation.route.Screen
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

/** What the shell does with a UI action (PRD §14 "every user action"). */
sealed interface ActionEvent {
    /** The shell logs this event name (no parameters). */
    data class Named(val name: String) : ActionEvent

    /** The view model already logs a richer event (with ids / values) for this action. */
    data object ByViewModel : ActionEvent

    /** Not a user intent worth an event (keystrokes, dismissals, lifecycle, paging). */
    data object Silent : ActionEvent
}

/**
 * PRD §14 catalog: every typed route has a screen name and every feature `UiAction` has a decision. The `when`
 * expressions are exhaustive, so a new route or action fails to compile until it is classified here.
 */
object AnalyticsCatalog {

    fun screenNameOf(screen: Screen): String = when (screen) {
        Screen.Home, Screen.Favorites, Screen.Bookings, Screen.Profile, Screen.Login, Screen.Notifications, Screen.PersonalInfo,
        Screen.Faq, is Screen.SampleDetails, is Screen.Register, is Screen.Otp, is Screen.SalonDetails, is Screen.AllSalons,
        is Screen.AllServices, is Screen.SalonReviews, is Screen.StaffReviews, is Screen.BookingDetails, is Screen.BookingVerify,
        is Screen.BookingSuccess, is Screen.RateBooking, is Screen.BookingStart, is Screen.ContentPage,
        -> AnalyticsScreenNames.fromRoute(screen::class.simpleName).orEmpty()
    }

    fun actionEventOf(action: Any?): ActionEvent = when (action) {
        is LoginContract.UiAction -> login(action)
        is RegisterContract.UiAction -> register(action)
        is OtpContract.UiAction -> otp(action)
        is OnboardingContract.UiAction, is GuestProfileContract.UiAction -> ActionEvent.ByViewModel
        is HomeContract.UiAction -> home(action)
        is AllSalonsContract.UiAction -> allSalons(action)
        is SalonDetailsContract.UiAction -> salonDetails(action)
        is StaffSheetContract.UiAction -> staff(action)
        is ReviewsContract.UiAction -> reviews(action)
        is FavoritesContract.UiAction -> favorites(action)
        is BookingsContract.UiAction -> bookings(action)
        is BookingDetailsContract.UiAction -> bookingDetails(action)
        is RatingContract.UiAction -> rating(action)
        is BookingFlowContract.UiAction -> bookingFlow(action)
        is BookingSuccessContract.UiAction -> ActionEvent.ByViewModel
        is NotificationsContract.UiAction -> notifications(action)
        is ProfileContract.UiAction -> profile(action)
        is EditProfileContract.UiAction -> editProfile(action)
        is ContentPageContract.UiAction, is FaqContract.UiAction -> content(action)
        else -> ActionEvent.Silent
    }

    private fun login(a: LoginContract.UiAction): ActionEvent = when (a) {
        LoginContract.UiAction.OnLoginClick, LoginContract.UiAction.OnRegisterClick, LoginContract.UiAction.OnLanguageToggle,
        LoginContract.UiAction.OnThemeToggle, -> ActionEvent.ByViewModel
        is LoginContract.UiAction.OnLegalClick -> ActionEvent.Named(Events.LEGAL_OPEN)
        is LoginContract.UiAction.OnCountrySelect -> ActionEvent.Named(Events.COUNTRY_SELECT)
        is LoginContract.UiAction.OnNumberChange, LoginContract.UiAction.OnCountryClick, LoginContract.UiAction.OnPickerDismiss,
        LoginContract.UiAction.OnDialogConfirm, LoginContract.UiAction.OnDialogDismiss, LoginContract.UiAction.OnRetryCountries,
        -> ActionEvent.Silent
    }

    private fun register(a: RegisterContract.UiAction): ActionEvent = when (a) {
        RegisterContract.UiAction.OnRegisterClick, RegisterContract.UiAction.OnLoginClick, RegisterContract.UiAction.OnLanguageToggle,
        RegisterContract.UiAction.OnThemeToggle, -> ActionEvent.ByViewModel
        is RegisterContract.UiAction.OnLegalClick -> ActionEvent.Named(Events.LEGAL_OPEN)
        is RegisterContract.UiAction.OnCountrySelect -> ActionEvent.Named(Events.COUNTRY_SELECT)
        is RegisterContract.UiAction.OnGenderSelect, is RegisterContract.UiAction.OnCitySelect, is RegisterContract.UiAction.OnAreaSelect,
        -> ActionEvent.Named(Events.REGISTER_FIELD_SELECT)
        is RegisterContract.UiAction.OnFirstNameChange, is RegisterContract.UiAction.OnLastNameChange, is RegisterContract.UiAction.OnEmailChange,
        is RegisterContract.UiAction.OnNumberChange, RegisterContract.UiAction.OnCountryClick, RegisterContract.UiAction.OnPickerDismiss,
        RegisterContract.UiAction.OnRetryLoad, -> ActionEvent.Silent
    }

    private fun otp(a: OtpContract.UiAction): ActionEvent = when (a) {
        OtpContract.UiAction.OnVerifyClick, OtpContract.UiAction.OnResendClick, OtpContract.UiAction.OnRetryRequest -> ActionEvent.ByViewModel
        is OtpContract.UiAction.OnCodeChange, OtpContract.UiAction.OnDialogDismiss -> ActionEvent.Silent
    }

    private fun home(a: HomeContract.UiAction): ActionEvent = when (a) {
        is HomeContract.UiAction.OnGenderSelect, is HomeContract.UiAction.OnBannerClick, HomeContract.UiAction.OnSearchClick,
        is HomeContract.UiAction.OnServiceClick, is HomeContract.UiAction.OnSalonClick, is HomeContract.UiAction.OnFavoriteClick,
        HomeContract.UiAction.OnEnableLocationClick, -> ActionEvent.ByViewModel
        HomeContract.UiAction.OnNotificationsClick -> ActionEvent.Named(Events.NOTIFICATIONS_OPEN)
        HomeContract.UiAction.OnServicesSeeMore, is HomeContract.UiAction.OnSeeAll -> ActionEvent.Named(Events.HOME_SEE_ALL)
        HomeContract.UiAction.OnDialogConfirm -> ActionEvent.Named(Events.LOCATION_PERMISSION_RESULT)
        HomeContract.UiAction.OnRefresh, HomeContract.UiAction.OnRetry, HomeContract.UiAction.OnResume, HomeContract.UiAction.OnDialogDismiss,
        -> ActionEvent.Silent
    }

    private fun allSalons(a: AllSalonsContract.UiAction): ActionEvent = when (a) {
        is AllSalonsContract.UiAction.OnTextChange, AllSalonsContract.UiAction.OnFilterClick, is AllSalonsContract.UiAction.OnChipRemove,
        is AllSalonsContract.UiAction.OnSalonClick, is AllSalonsContract.UiAction.OnFavoriteClick, is AllSalonsContract.UiAction.OnFiltersApplied,
        -> ActionEvent.ByViewModel
        AllSalonsContract.UiAction.OnDialogConfirm -> ActionEvent.Named(Events.LOCATION_PERMISSION_RESULT)
        AllSalonsContract.UiAction.OnLoadMore, AllSalonsContract.UiAction.OnRefresh, AllSalonsContract.UiAction.OnRetry,
        AllSalonsContract.UiAction.OnDialogDismiss, -> ActionEvent.Silent
    }

    private fun salonDetails(a: SalonDetailsContract.UiAction): ActionEvent = when (a) {
        SalonDetailsContract.UiAction.OnShareClick, SalonDetailsContract.UiAction.OnFavoriteClick, SalonDetailsContract.UiAction.OnLocationClick,
        SalonDetailsContract.UiAction.OnCallClick, SalonDetailsContract.UiAction.OnWhatsAppClick, SalonDetailsContract.UiAction.OnBookClick,
        -> ActionEvent.ByViewModel
        is SalonDetailsContract.UiAction.OnStaffClick -> ActionEvent.Named(Events.STAFF_OPEN)
        is SalonDetailsContract.UiAction.OnServiceClick -> ActionEvent.Named(Events.SERVICE_OPEN)
        is SalonDetailsContract.UiAction.OnGalleryClick -> ActionEvent.Named(Events.GALLERY_OPEN)
        SalonDetailsContract.UiAction.OnAllReviewsClick, SalonDetailsContract.UiAction.OnAddReviewClick -> ActionEvent.Named(
            Events.REVIEWS_OPEN,
        )
        SalonDetailsContract.UiAction.OnHoursToggle -> ActionEvent.Named(Events.HOURS_TOGGLE)
        SalonDetailsContract.UiAction.OnRetry, SalonDetailsContract.UiAction.OnRefresh, SalonDetailsContract.UiAction.OnDialogConfirm,
        SalonDetailsContract.UiAction.OnDialogDismiss, -> ActionEvent.Silent
    }

    private fun staff(a: StaffSheetContract.UiAction): ActionEvent = when (a) {
        StaffSheetContract.UiAction.OnAllReviewsClick, StaffSheetContract.UiAction.OnAddReviewClick -> ActionEvent.Named(
            Events.REVIEWS_OPEN,
        )
        StaffSheetContract.UiAction.OnRetry, StaffSheetContract.UiAction.OnDialogConfirm, StaffSheetContract.UiAction.OnDialogDismiss,
        -> ActionEvent.Silent
    }

    private fun reviews(a: ReviewsContract.UiAction): ActionEvent = when (a) {
        ReviewsContract.UiAction.OnSubmit -> ActionEvent.ByViewModel
        ReviewsContract.UiAction.OnAddReviewClick -> ActionEvent.Named(Events.REVIEW_START)
        ReviewsContract.UiAction.OnRetry, ReviewsContract.UiAction.OnRefresh, ReviewsContract.UiAction.OnLoadMore,
        is ReviewsContract.UiAction.OnRatingChange, is ReviewsContract.UiAction.OnCommentChange, ReviewsContract.UiAction.OnFormDismiss,
        ReviewsContract.UiAction.OnDialogConfirm, ReviewsContract.UiAction.OnDialogDismiss, -> ActionEvent.Silent
    }

    private fun favorites(a: FavoritesContract.UiAction): ActionEvent = when (a) {
        FavoritesContract.UiAction.OnExploreClick, is FavoritesContract.UiAction.OnRemoveClick -> ActionEvent.ByViewModel
        is FavoritesContract.UiAction.OnSalonClick -> ActionEvent.Named(Events.SALON_OPEN)
        FavoritesContract.UiAction.OnLoginClick -> ActionEvent.Named(Events.LOGIN_OPEN)
        FavoritesContract.UiAction.OnLoadMore, FavoritesContract.UiAction.OnRefresh, FavoritesContract.UiAction.OnRetry,
        FavoritesContract.UiAction.OnResume, -> ActionEvent.Silent
    }

    private fun bookings(a: BookingsContract.UiAction): ActionEvent = when (a) {
        is BookingsContract.UiAction.OnTabSelect, is BookingsContract.UiAction.OnQueryChange, is BookingsContract.UiAction.OnBookingClick,
        -> ActionEvent.ByViewModel
        BookingsContract.UiAction.OnLoginClick -> ActionEvent.Named(Events.LOGIN_OPEN)
        BookingsContract.UiAction.OnBookNowClick -> ActionEvent.Named(Events.BOOK_NOW_CLICK)
        BookingsContract.UiAction.OnLoadMore, BookingsContract.UiAction.OnRefresh, BookingsContract.UiAction.OnRetry,
        BookingsContract.UiAction.OnResume, -> ActionEvent.Silent
    }

    private fun bookingDetails(a: BookingDetailsContract.UiAction): ActionEvent = when (a) {
        BookingDetailsContract.UiAction.OnCancelConfirm -> ActionEvent.ByViewModel
        BookingDetailsContract.UiAction.OnCallClick -> ActionEvent.Named(Events.CALL_SALON)
        BookingDetailsContract.UiAction.OnWhatsAppClick -> ActionEvent.Named(Events.WHATSAPP_SALON)
        BookingDetailsContract.UiAction.OnRateClick -> ActionEvent.Named(Events.RATE_OPEN)
        BookingDetailsContract.UiAction.OnCancelClick -> ActionEvent.Named(Events.BOOKING_CANCEL_START)
        BookingDetailsContract.UiAction.OnRetry, BookingDetailsContract.UiAction.OnRefresh, BookingDetailsContract.UiAction.OnResume,
        BookingDetailsContract.UiAction.OnCancelDismiss, -> ActionEvent.Silent
    }

    private fun rating(a: RatingContract.UiAction): ActionEvent = when (a) {
        RatingContract.UiAction.OnSubmit, RatingContract.UiAction.OnSkip -> ActionEvent.ByViewModel
        RatingContract.UiAction.OnDone -> ActionEvent.Named(Events.RATING_DONE)
        RatingContract.UiAction.OnRetry, is RatingContract.UiAction.OnRatingChange, is RatingContract.UiAction.OnCommentChange,
        -> ActionEvent.Silent
    }

    private fun bookingFlow(a: BookingFlowContract.UiAction): ActionEvent = when (a) {
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

    private fun notifications(a: NotificationsContract.UiAction): ActionEvent = when (a) {
        is NotificationsContract.UiAction.OnItemClick, NotificationsContract.UiAction.OnViewBooking, NotificationsContract.UiAction.OnApplyFilters,
        NotificationsContract.UiAction.OnResetFilters, -> ActionEvent.ByViewModel
        NotificationsContract.UiAction.OnFilterClick -> ActionEvent.Named(Events.FILTER_OPEN)
        is NotificationsContract.UiAction.OnChipRemove -> ActionEvent.Named(Events.FILTER_CHIP_REMOVE)
        NotificationsContract.UiAction.OnRefresh, NotificationsContract.UiAction.OnResume, NotificationsContract.UiAction.OnRetry,
        NotificationsContract.UiAction.OnLoadMore, is NotificationsContract.UiAction.OnVisible, NotificationsContract.UiAction.OnPopupDismiss,
        NotificationsContract.UiAction.OnSheetDismiss, is NotificationsContract.UiAction.OnDraftFromChange,
        is NotificationsContract.UiAction.OnDraftToChange, is NotificationsContract.UiAction.OnDraftQueryChange, -> ActionEvent.Silent
    }

    private fun profile(a: ProfileContract.UiAction): ActionEvent = when (a) {
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

    private fun editProfile(a: EditProfileContract.UiAction): ActionEvent = when (a) {
        EditProfileContract.UiAction.OnSaveClick -> ActionEvent.ByViewModel
        is EditProfileContract.UiAction.OnCountrySelect -> ActionEvent.Named(Events.COUNTRY_SELECT)
        is EditProfileContract.UiAction.OnGenderSelect, is EditProfileContract.UiAction.OnCitySelect, is EditProfileContract.UiAction.OnAreaSelect,
        -> ActionEvent.Named(Events.REGISTER_FIELD_SELECT)
        is EditProfileContract.UiAction.OnFirstNameChange, is EditProfileContract.UiAction.OnLastNameChange,
        is EditProfileContract.UiAction.OnEmailChange, is EditProfileContract.UiAction.OnNumberChange, EditProfileContract.UiAction.OnCountryClick,
        EditProfileContract.UiAction.OnPickerDismiss, EditProfileContract.UiAction.OnRetryLoad, -> ActionEvent.Silent
    }

    private fun content(a: Any): ActionEvent = when (a) {
        is ContentPageContract.UiAction.OnLinkClick, is ContentPageContract.UiAction.OnContactChannel, is FaqContract.UiAction.OnToggle,
        -> ActionEvent.ByViewModel
        else -> ActionEvent.Silent
    }

    /** Shell-level event names (snake_case, PRD §14 suggested list where one exists). */
    object Events {
        const val LEGAL_OPEN = "legal_open"
        const val COUNTRY_SELECT = "country_select"
        const val REGISTER_FIELD_SELECT = "register_field_select"
        const val NOTIFICATIONS_OPEN = "notifications_open"
        const val HOME_SEE_ALL = "home_see_all"
        const val LOCATION_PERMISSION_RESULT = "location_permission_result"
        const val STAFF_OPEN = "staff_open"
        const val SERVICE_OPEN = "service_open"
        const val GALLERY_OPEN = "gallery_open"
        const val REVIEWS_OPEN = "reviews_open"
        const val HOURS_TOGGLE = "salon_hours_toggle"
        const val REVIEW_START = "review_start"
        const val SALON_OPEN = "salon_open"
        const val LOGIN_OPEN = "login_open"
        const val BOOK_NOW_CLICK = "book_click"
        const val CALL_SALON = "call_salon"
        const val WHATSAPP_SALON = "whatsapp_salon"
        const val RATE_OPEN = "rate_open"
        const val BOOKING_CANCEL_START = "booking_cancel_start"
        const val RATING_DONE = "rating_done"
        const val BOOKING_SUBMIT = "booking_submit"
        const val BOOKING_DATE_SELECT = "booking_step_date"
        const val BOOKING_SLOT_SELECT = "booking_step_slot"
        const val BOOKING_STAFF_SELECT = "booking_step_staff"
        const val BOOKING_COMPANION_ADD = "booking_companion_add"
        const val BOOKING_COMPANION_REMOVE = "booking_companion_remove"
        const val BOOKING_BRIDE_TOGGLE = "booking_bride_toggle"
        const val BOOKING_BACK = "booking_step_back"
        const val FILTER_OPEN = "filter_open"
        const val FILTER_CHIP_REMOVE = "filter_chip_remove"
        const val PROFILE_SHEET_OPEN = "profile_sheet_open"
    }
}
