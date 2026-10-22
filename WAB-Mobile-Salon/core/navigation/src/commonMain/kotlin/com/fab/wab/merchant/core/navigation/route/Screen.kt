package com.fab.wab.merchant.core.navigation.route

import kotlinx.serialization.Serializable

/** Typed destinations of the merchant app (PRD §8.2 screens index M01–M26). */
sealed interface Screen {
    // Auth (M02, M03) and shared content
    @Serializable data object Login : Screen

    @Serializable data class Otp(val purpose: String, val countryCode: String, val number: String) : Screen

    @Serializable data class ContentPage(val slug: String) : Screen

    @Serializable data object Faq : Screen

    // Salon application flow (M04–M06)
    @Serializable data class Registration(val countryCode: String, val number: String) : Screen

    @Serializable data object ApplicationStatus : Screen

    @Serializable data object ApplicationResubmit : Screen

    @Serializable data object SetupChecklist : Screen

    // Tabs (M07, M08, M11, M12, M25)
    @Serializable data object Home : Screen

    @Serializable data object Bookings : Screen

    @Serializable data object Calendar : Screen

    @Serializable data object SalonHub : Screen

    @Serializable data object More : Screen

    // Bookings (M09)
    @Serializable data class BookingDetails(val bookingId: String) : Screen

    // Salon management (M13–M19)
    @Serializable data object SalonProfile : Screen

    @Serializable data object Gallery : Screen

    @Serializable data object WorkingHours : Screen

    @Serializable data object Services : Screen

    /** Edit [serviceId], or add the catalog service [catalogServiceId]. */
    @Serializable data class ServiceEdit(val serviceId: String? = null, val catalogServiceId: String? = null) : Screen

    @Serializable data object CatalogPicker : Screen

    @Serializable data object CatalogRequests : Screen

    @Serializable data object Team : Screen

    @Serializable data class MemberEdit(val memberId: String? = null) : Screen

    @Serializable data class StaffProfile(val memberId: String) : Screen

    @Serializable data class PermissionsEditor(val memberId: String) : Screen

    @Serializable data object Policies : Screen

    // Money and account (M22–M25)
    @Serializable data object Finance : Screen

    @Serializable data object BankDetails : Screen

    @Serializable data object Subscription : Screen

    @Serializable data object Notifications : Screen

    @Serializable data object Settings : Screen

    // Template reference feature (removed with feature/sample)
    @Serializable data class SampleDetails(val itemId: Int) : Screen
}
