package com.fab.wab.customer.app.analytics

import com.fab.wab.customer.core.analytics.AnalyticsScreenNames
import com.fab.wab.customer.core.analytics.AnalyticsValue
import com.fab.wab.customer.core.domain.booking.BookingTab
import com.fab.wab.customer.core.mvi.BaseViewModel
import com.fab.wab.customer.core.mvi.UiActionObserver
import com.fab.wab.customer.core.navigation.route.Screen
import com.fab.wab.customer.feature.auth.presentation.analytics.LoginAnalytics
import com.fab.wab.customer.feature.auth.presentation.analytics.OtpAnalytics
import com.fab.wab.customer.feature.auth.presentation.analytics.RegisterAnalytics
import com.fab.wab.customer.feature.auth.presentation.controller.contract.LoginContract
import com.fab.wab.customer.feature.auth.presentation.controller.contract.OtpContract
import com.fab.wab.customer.feature.auth.presentation.controller.contract.RegisterContract
import com.fab.wab.customer.feature.booking.presentation.analytics.BookingAnalytics
import com.fab.wab.customer.feature.booking.presentation.controller.contract.BookingFlowContract
import com.fab.wab.customer.feature.booking.presentation.controller.contract.BookingSuccessContract
import com.fab.wab.customer.feature.bookings.presentation.analytics.BookingsAnalytics
import com.fab.wab.customer.feature.bookings.presentation.controller.contract.BookingDetailsContract
import com.fab.wab.customer.feature.bookings.presentation.controller.contract.BookingsContract
import com.fab.wab.customer.feature.bookings.presentation.controller.contract.RatingContract
import com.fab.wab.customer.feature.content.presentation.controller.contract.ContentPageContract
import com.fab.wab.customer.feature.content.presentation.controller.contract.FaqContract
import com.fab.wab.customer.feature.favorites.presentation.analytics.FavoritesAnalytics
import com.fab.wab.customer.feature.favorites.presentation.controller.contract.FavoritesContract
import com.fab.wab.customer.feature.home.presentation.analytics.HomeAnalytics
import com.fab.wab.customer.feature.home.presentation.controller.contract.HomeContract
import com.fab.wab.customer.feature.notifications.presentation.analytics.NotificationsAnalytics
import com.fab.wab.customer.feature.notifications.presentation.controller.contract.NotificationsContract
import com.fab.wab.customer.feature.onboarding.presentation.analytics.GuestProfileAnalytics
import com.fab.wab.customer.feature.onboarding.presentation.analytics.OnboardingAnalytics
import com.fab.wab.customer.feature.onboarding.presentation.controller.contract.GuestProfileContract
import com.fab.wab.customer.feature.onboarding.presentation.controller.contract.OnboardingContract
import com.fab.wab.customer.feature.profile.presentation.analytics.ProfileAnalytics
import com.fab.wab.customer.feature.profile.presentation.controller.contract.EditProfileContract
import com.fab.wab.customer.feature.profile.presentation.controller.contract.ProfileContract
import com.fab.wab.customer.feature.salon.presentation.analytics.SalonAnalytics
import com.fab.wab.customer.feature.salon.presentation.controller.contract.ReviewsContract
import com.fab.wab.customer.feature.salon.presentation.controller.contract.SalonDetailsContract
import com.fab.wab.customer.feature.salon.presentation.controller.contract.StaffSheetContract
import com.fab.wab.customer.feature.salons.presentation.analytics.SalonsAnalytics
import com.fab.wab.customer.feature.salons.presentation.controller.contract.AllSalonsContract
import kotlinx.coroutines.test.runTest
import kotlin.test.Test
import kotlin.test.assertEquals
import kotlin.test.assertIs
import kotlin.test.assertTrue

private val SNAKE_CASE = Regex("^[a-z][a-z0-9_]*$")

/** One instance per typed route: adding a route without a catalog entry fails to compile; this checks the names. */
private val SCREENS: List<Screen> = listOf(
    Screen.Home, Screen.Favorites, Screen.Bookings, Screen.Profile, Screen.Login, Screen.Notifications, Screen.PersonalInfo, Screen.Faq,
    Screen.SampleDetails(1), Screen.Register(), Screen.Otp("LOGIN", "JO", "1"), Screen.SalonDetails("s"), Screen.AllSalons("FEMALE"),
    Screen.AllServices("FEMALE"), Screen.SalonReviews("s"), Screen.StaffReviews("s", "m"), Screen.BookingDetails("b"),
    Screen.BookingVerify("d"), Screen.BookingSuccess("b", "WAB-1"), Screen.RateBooking("b"), Screen.BookingStart("s"), Screen.ContentPage("terms"),
)

/** One action per feature contract (the catalog's `when` is exhaustive per contract). */
private val ACTIONS: List<Any> = listOf(
    LoginContract.UiAction.OnLoginClick, RegisterContract.UiAction.OnRegisterClick, OtpContract.UiAction.OnVerifyClick,
    OnboardingContract.UiAction.OnSkipClicked, GuestProfileContract.UiAction.OnContinueClick, HomeContract.UiAction.OnNotificationsClick,
    AllSalonsContract.UiAction.OnFilterClick, SalonDetailsContract.UiAction.OnStaffClick("m"), StaffSheetContract.UiAction.OnAllReviewsClick,
    ReviewsContract.UiAction.OnAddReviewClick, FavoritesContract.UiAction.OnSalonClick("s"), BookingsContract.UiAction.OnTabSelect(BookingTab.PAST),
    BookingDetailsContract.UiAction.OnCancelClick, RatingContract.UiAction.OnDone, BookingFlowContract.UiAction.OnConfirm,
    BookingSuccessContract.UiAction.OnCopyReference, NotificationsContract.UiAction.OnFilterClick, ProfileContract.UiAction.OnLogoutClick,
    EditProfileContract.UiAction.OnSaveClick, ContentPageContract.UiAction.OnLinkClick("u"), FaqContract.UiAction.OnToggle("f"),
)

/** PRD §14 suggested events → where the app logs them (view-model constants or the shell catalog). */
private val PRD_EVENTS: Map<String, String> = mapOf(
    "onboarding_skip" to OnboardingAnalytics.ACTION_SKIP,
    "onboarding_complete" to OnboardingAnalytics.ACTION_COMPLETE,
    "nickname_saved" to GuestProfileAnalytics.ACTION_SAVED,
    "gender_tab_switch" to HomeAnalytics.ACTION_GENDER_TAB,
    "banner_click" to HomeAnalytics.ACTION_BANNER_CLICK,
    "search_query" to SalonsAnalytics.ACTION_SEARCH,
    "filter_apply" to SalonsAnalytics.ACTION_FILTER_APPLY,
    "filter_chip_remove" to AnalyticsCatalog.Events.FILTER_CHIP_REMOVE,
    "salon_open" to AnalyticsCatalog.Events.SALON_OPEN,
    "salon_share" to SalonAnalytics.ACTION_SHARE,
    "favorite_add" to SalonAnalytics.ACTION_FAVORITE,
    "favorite_remove" to FavoritesAnalytics.ACTION_REMOVE,
    "staff_open" to AnalyticsCatalog.Events.STAFF_OPEN,
    "service_open" to AnalyticsCatalog.Events.SERVICE_OPEN,
    "gallery_open" to AnalyticsCatalog.Events.GALLERY_OPEN,
    "call_salon" to AnalyticsCatalog.Events.CALL_SALON,
    "whatsapp_salon" to AnalyticsCatalog.Events.WHATSAPP_SALON,
    "open_maps" to SalonAnalytics.ACTION_MAPS,
    "location_permission_result" to AnalyticsCatalog.Events.LOCATION_PERMISSION_RESULT,
    "book_click" to AnalyticsCatalog.Events.BOOK_NOW_CLICK,
    "booking_step_*" to BookingAnalytics.ACTION_STEP,
    "booking_submit" to AnalyticsCatalog.Events.BOOKING_SUBMIT,
    "booking_cancel" to BookingsAnalytics.ACTION_CANCEL,
    "review_submit" to SalonAnalytics.ACTION_REVIEW_SUBMIT,
    "login_start" to LoginAnalytics.ACTION_LOGIN_START,
    "otp_request" to OtpAnalytics.ACTION_REQUEST,
    "otp_verify_success" to OtpAnalytics.ACTION_VERIFY_SUCCESS,
    "otp_verify_fail" to OtpAnalytics.ACTION_VERIFY_FAIL,
    "register_complete" to RegisterAnalytics.ACTION_COMPLETE,
    "logout" to ProfileAnalytics.ACTION_LOGOUT,
    "delete_account" to ProfileAnalytics.ACTION_DELETE_ACCOUNT,
    "notification_open" to NotificationsAnalytics.ACTION_OPEN,
    "language_change" to LoginAnalytics.ACTION_LANGUAGE_CHANGE,
    "theme_change" to LoginAnalytics.ACTION_THEME_CHANGE,
)

private class TapViewModel : BaseViewModel<Int, String, Nothing>(0) {
    override fun handle(event: String) = updateState { this + 1 }
}

class AnalyticsCatalogTest {

    @Test
    fun everyRouteHasAStableSnakeCaseScreenName() {
        val names = SCREENS.map { AnalyticsCatalog.screenNameOf(it) }
        names.forEach { assertTrue(SNAKE_CASE.matches(it), "bad screen name '$it'") }
        assertEquals(names.size, names.toSet().size, "screen names must be unique")
        SCREENS.forEach { assertEquals(AnalyticsScreenNames.fromRoute(it::class.simpleName), AnalyticsCatalog.screenNameOf(it)) }
    }

    @Test
    fun everyFeatureActionIsClassifiedAndNamedEventsAreSnakeCase() {
        ACTIONS.forEach { action ->
            when (val event = AnalyticsCatalog.actionEventOf(action)) {
                is ActionEvent.Named -> assertTrue(SNAKE_CASE.matches(event.name), "bad event name '${event.name}' for $action")
                ActionEvent.ByViewModel, ActionEvent.Silent -> Unit
            }
        }
        assertEquals(ActionEvent.Silent, AnalyticsCatalog.actionEventOf("not an action"))
        val named = ActionAnalytics.eventFor("HomeViewModel", HomeContract.UiAction.OnNotificationsClick)
        assertEquals(AnalyticsCatalog.Events.NOTIFICATIONS_OPEN, named?.name)
        assertEquals(AnalyticsValue.Text("HomeViewModel"), named?.params?.get(ActionAnalytics.PARAM_OWNER))
        assertEquals(null, ActionAnalytics.eventFor("LoginViewModel", LoginContract.UiAction.OnLoginClick), "view-model-tracked actions are not duplicated")
    }

    @Test
    fun prdSuggestedEventsAreCoveredByConstantsOrTheCatalog() {
        PRD_EVENTS.forEach { (prd, app) -> assertTrue(app.isNotBlank() && SNAKE_CASE.matches(app), "$prd → '$app'") }
        // payment_start / payment_success / payment_failure / push_open arrive with CUS-047 (payments) and CUS-063 (push tap on device).
    }

    @Test
    fun baseViewModelTapsEveryActionBeforeHandlingIt() = runTest {
        val seen = mutableListOf<Pair<String, Any?>>()
        UiActionObserver.install { owner, action -> seen += owner to action }
        val vm = TapViewModel()
        vm.onEvent("tap")
        assertEquals(listOf("TapViewModel" to "tap"), seen)
        assertIs<Int>(vm.uiState.value)
        UiActionObserver.install(null)
    }
}
