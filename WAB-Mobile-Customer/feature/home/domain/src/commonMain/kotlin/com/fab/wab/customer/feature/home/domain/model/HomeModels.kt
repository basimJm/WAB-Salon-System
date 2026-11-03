package com.fab.wab.customer.feature.home.domain.model

import com.fab.wab.customer.core.domain.salon.BusinessType
import com.fab.wab.customer.core.domain.salon.SalonSummary

/** What a banner tap does (PRD S03 item 2); unknown server codes degrade to [None]. */
sealed interface BannerAction {
    data object None : BannerAction
    data class Salon(val salonId: String) : BannerAction
    data class ExternalUrl(val url: String) : BannerAction
}

/** Contract codes of `actionType` (`GET /home`, `GET /banners`). */
object BannerActionCodes {
    const val NONE = "NONE"
    const val SALON = "SALON"
    const val EXTERNAL_URL = "EXTERNAL_URL"
}

fun bannerActionOf(type: String?, value: String?): BannerAction = when {
    type.equals(BannerActionCodes.SALON, ignoreCase = true) && !value.isNullOrBlank() -> BannerAction.Salon(value)
    type.equals(BannerActionCodes.EXTERNAL_URL, ignoreCase = true) && !value.isNullOrBlank() -> BannerAction.ExternalUrl(value)
    else -> BannerAction.None
}

data class HomeBanner(val id: String, val imageUrl: String, val action: BannerAction)

/** An Explore tile: a most-booked catalog service of one business type (BUSINESS_DOMAIN §5.22). */
data class HomeService(
    val id: String,
    val name: String,
    val description: String,
    val imageUrl: String?,
    val businessType: BusinessType = BusinessType.SALON,
)

/** A Home section; `hasMore` is the server's "> 10" decision behind "See more / See all". */
data class HomeSection<T>(val items: List<T>, val hasMore: Boolean) {
    companion object {
        fun <T> empty(): HomeSection<T> = HomeSection(emptyList(), hasMore = false)
    }
}

/** A *Book again* entry: the business of a completed booking and the services booked then (§5.22). */
data class BookAgainEntry(val salon: SalonSummary, val lastBookingId: String, val salonServiceIds: List<String>)

/**
 * One `GET /home` answer for one type lens (PRD S03: one request, one shimmer), in the Home order of BUSINESS_DOMAIN §5.22:
 * banners → Explore → Near you → Recommended → Book again. [nearYou] is null when no coordinates were sent; [bookAgain]
 * is null for guests (and empty for customers without completed bookings).
 */
data class HomeContent(
    val unreadCount: Int,
    val banners: List<HomeBanner>,
    val explore: HomeSection<HomeService>,
    val nearYou: HomeSection<SalonSummary>?,
    val recommended: HomeSection<SalonSummary>,
    val bookAgain: HomeSection<BookAgainEntry>?,
)
