package com.fab.wab.customer.core.navigation.route

import kotlinx.serialization.Serializable

sealed interface Screen {
    @Serializable
    data object Home : Screen

    @Serializable
    data class SampleDetails(val itemId: Int) : Screen

    @Serializable
    data object Favorites : Screen

    @Serializable
    data object Bookings : Screen

    @Serializable
    data object Profile : Screen

    @Serializable
    data object Login : Screen

    /** S12; prefilled from S11's "not registered" path (PRD S11). */
    @Serializable
    data class Register(val countryCode: String? = null, val number: String? = null) : Screen

    /** S13; [purpose] is an `AuthPurpose` code, the phone is the national number with its country. */
    @Serializable
    data class Otp(val purpose: String, val countryCode: String, val number: String) : Screen

    /** S07 salon profile. */
    @Serializable
    data class SalonDetails(val salonId: String) : Screen

    /** S04 all salons; opened from Home with no filters, a service pre-filter, or a `SalonListFilter` code. */
    @Serializable
    data class AllSalons(val serviceId: String? = null, val serviceName: String? = null, val filter: String? = null) : Screen

    /** S06 all services. */
    @Serializable
    data object AllServices : Screen

    /** S19 notifications (registered users). */
    @Serializable
    data object Notifications : Screen

    /** S23 legal / support pages by slug (`GET /content/pages/{slug}`). */
    @Serializable
    data class ContentPage(val slug: String) : Screen
}
