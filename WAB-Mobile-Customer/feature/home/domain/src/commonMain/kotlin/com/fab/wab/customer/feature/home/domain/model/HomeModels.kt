package com.fab.wab.customer.feature.home.domain.model

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

data class HomeService(val id: String, val name: String, val description: String, val imageUrl: String?)

/** A horizontal Home section; `hasMore` is the server's "> 10" decision behind "See more / See all". */
data class HomeSection<T>(val items: List<T>, val hasMore: Boolean)

/**
 * One `GET /home` answer (PRD S03: one request, one shimmer), sections per business type (BUSINESS_DOMAIN §5.19, in the
 * Home order). The nearest sections are null when no coordinates were sent.
 */
data class HomeContent(
    val unreadCount: Int,
    val banners: List<HomeBanner>,
    val salonServices: HomeSection<HomeService>,
    val clinicServices: HomeSection<HomeService>,
    val recommendedSalons: HomeSection<SalonSummary>,
    val recommendedClinics: HomeSection<SalonSummary>,
    val nearestSalons: HomeSection<SalonSummary>?,
    val nearestClinics: HomeSection<SalonSummary>?,
)
