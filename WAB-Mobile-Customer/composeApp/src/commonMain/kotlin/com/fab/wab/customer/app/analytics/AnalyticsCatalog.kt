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

    fun actionEventOf(action: Any?): ActionEvent = authOrDiscovery(action) ?: bookingOrAccount(action) ?: ActionEvent.Silent

    private fun authOrDiscovery(action: Any?): ActionEvent? = when (action) {
        is LoginContract.UiAction -> AuthDiscoveryActionEvents.login(action)
        is RegisterContract.UiAction -> AuthDiscoveryActionEvents.register(action)
        is OtpContract.UiAction -> AuthDiscoveryActionEvents.otp(action)
        is OnboardingContract.UiAction, is GuestProfileContract.UiAction -> ActionEvent.ByViewModel
        is HomeContract.UiAction -> AuthDiscoveryActionEvents.home(action)
        is AllSalonsContract.UiAction -> AuthDiscoveryActionEvents.allSalons(action)
        is SalonDetailsContract.UiAction -> AuthDiscoveryActionEvents.salonDetails(action)
        is StaffSheetContract.UiAction -> AuthDiscoveryActionEvents.staff(action)
        is ReviewsContract.UiAction -> AuthDiscoveryActionEvents.reviews(action)
        is FavoritesContract.UiAction -> AuthDiscoveryActionEvents.favorites(action)
        else -> null
    }

    private fun bookingOrAccount(action: Any?): ActionEvent? = when (action) {
        is BookingsContract.UiAction -> BookingAccountActionEvents.bookings(action)
        is BookingDetailsContract.UiAction -> BookingAccountActionEvents.bookingDetails(action)
        is RatingContract.UiAction -> BookingAccountActionEvents.rating(action)
        is BookingFlowContract.UiAction -> BookingAccountActionEvents.bookingFlow(action)
        is BookingSuccessContract.UiAction -> ActionEvent.ByViewModel
        is NotificationsContract.UiAction -> BookingAccountActionEvents.notifications(action)
        is ProfileContract.UiAction -> BookingAccountActionEvents.profile(action)
        is EditProfileContract.UiAction -> BookingAccountActionEvents.editProfile(action)
        is ContentPageContract.UiAction, is FaqContract.UiAction -> BookingAccountActionEvents.content(action)
        else -> null
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
