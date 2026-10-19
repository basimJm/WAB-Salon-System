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

/** Per-feature classification of `UiAction`s (exhaustive `when` per contract; see [AnalyticsCatalog]). */
internal object AuthDiscoveryActionEvents {
    fun login(a: LoginContract.UiAction): ActionEvent = when (a) {
        LoginContract.UiAction.OnLoginClick, LoginContract.UiAction.OnRegisterClick, LoginContract.UiAction.OnLanguageToggle,
        LoginContract.UiAction.OnThemeToggle, -> ActionEvent.ByViewModel
        is LoginContract.UiAction.OnLegalClick -> ActionEvent.Named(Events.LEGAL_OPEN)
        is LoginContract.UiAction.OnCountrySelect -> ActionEvent.Named(Events.COUNTRY_SELECT)
        is LoginContract.UiAction.OnNumberChange, LoginContract.UiAction.OnCountryClick, LoginContract.UiAction.OnPickerDismiss,
        LoginContract.UiAction.OnDialogConfirm, LoginContract.UiAction.OnDialogDismiss, LoginContract.UiAction.OnRetryCountries,
        -> ActionEvent.Silent
    }
    fun register(a: RegisterContract.UiAction): ActionEvent = when (a) {
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
    fun otp(a: OtpContract.UiAction): ActionEvent = when (a) {
        OtpContract.UiAction.OnVerifyClick, OtpContract.UiAction.OnResendClick, OtpContract.UiAction.OnRetryRequest -> ActionEvent.ByViewModel
        is OtpContract.UiAction.OnCodeChange, OtpContract.UiAction.OnDialogDismiss -> ActionEvent.Silent
    }
    fun home(a: HomeContract.UiAction): ActionEvent = when (a) {
        is HomeContract.UiAction.OnGenderSelect, is HomeContract.UiAction.OnBannerClick, HomeContract.UiAction.OnSearchClick,
        is HomeContract.UiAction.OnServiceClick, is HomeContract.UiAction.OnSalonClick, is HomeContract.UiAction.OnFavoriteClick,
        HomeContract.UiAction.OnEnableLocationClick, -> ActionEvent.ByViewModel
        HomeContract.UiAction.OnNotificationsClick -> ActionEvent.Named(Events.NOTIFICATIONS_OPEN)
        HomeContract.UiAction.OnServicesSeeMore, is HomeContract.UiAction.OnSeeAll -> ActionEvent.Named(Events.HOME_SEE_ALL)
        HomeContract.UiAction.OnDialogConfirm -> ActionEvent.Named(Events.LOCATION_PERMISSION_RESULT)
        HomeContract.UiAction.OnRefresh, HomeContract.UiAction.OnRetry, HomeContract.UiAction.OnResume, HomeContract.UiAction.OnDialogDismiss,
        -> ActionEvent.Silent
    }
    fun allSalons(a: AllSalonsContract.UiAction): ActionEvent = when (a) {
        is AllSalonsContract.UiAction.OnTextChange, AllSalonsContract.UiAction.OnFilterClick, is AllSalonsContract.UiAction.OnChipRemove,
        is AllSalonsContract.UiAction.OnSalonClick, is AllSalonsContract.UiAction.OnFavoriteClick, is AllSalonsContract.UiAction.OnFiltersApplied,
        -> ActionEvent.ByViewModel
        AllSalonsContract.UiAction.OnDialogConfirm -> ActionEvent.Named(Events.LOCATION_PERMISSION_RESULT)
        AllSalonsContract.UiAction.OnLoadMore, AllSalonsContract.UiAction.OnRefresh, AllSalonsContract.UiAction.OnRetry,
        AllSalonsContract.UiAction.OnDialogDismiss, -> ActionEvent.Silent
    }
    fun salonDetails(a: SalonDetailsContract.UiAction): ActionEvent = when (a) {
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
    fun staff(a: StaffSheetContract.UiAction): ActionEvent = when (a) {
        StaffSheetContract.UiAction.OnAllReviewsClick, StaffSheetContract.UiAction.OnAddReviewClick -> ActionEvent.Named(
            Events.REVIEWS_OPEN,
        )
        StaffSheetContract.UiAction.OnRetry, StaffSheetContract.UiAction.OnDialogConfirm, StaffSheetContract.UiAction.OnDialogDismiss,
        -> ActionEvent.Silent
    }
    fun reviews(a: ReviewsContract.UiAction): ActionEvent = when (a) {
        ReviewsContract.UiAction.OnSubmit -> ActionEvent.ByViewModel
        ReviewsContract.UiAction.OnAddReviewClick -> ActionEvent.Named(Events.REVIEW_START)
        ReviewsContract.UiAction.OnRetry, ReviewsContract.UiAction.OnRefresh, ReviewsContract.UiAction.OnLoadMore,
        is ReviewsContract.UiAction.OnRatingChange, is ReviewsContract.UiAction.OnCommentChange, ReviewsContract.UiAction.OnFormDismiss,
        ReviewsContract.UiAction.OnDialogConfirm, ReviewsContract.UiAction.OnDialogDismiss, -> ActionEvent.Silent
    }
    fun favorites(a: FavoritesContract.UiAction): ActionEvent = when (a) {
        FavoritesContract.UiAction.OnExploreClick, is FavoritesContract.UiAction.OnRemoveClick -> ActionEvent.ByViewModel
        is FavoritesContract.UiAction.OnSalonClick -> ActionEvent.Named(Events.SALON_OPEN)
        FavoritesContract.UiAction.OnLoginClick -> ActionEvent.Named(Events.LOGIN_OPEN)
        FavoritesContract.UiAction.OnLoadMore, FavoritesContract.UiAction.OnRefresh, FavoritesContract.UiAction.OnRetry,
        FavoritesContract.UiAction.OnResume, -> ActionEvent.Silent
    }
}
