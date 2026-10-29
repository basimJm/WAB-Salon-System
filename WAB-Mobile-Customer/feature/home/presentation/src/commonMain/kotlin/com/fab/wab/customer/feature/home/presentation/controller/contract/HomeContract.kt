package com.fab.wab.customer.feature.home.presentation.controller.contract

import com.fab.wab.customer.core.domain.salon.BusinessType
import com.fab.wab.customer.core.domain.salon.SalonSummary
import com.fab.wab.customer.core.domain.session.Gender
import com.fab.wab.customer.core.navigation.route.SalonListFilter
import com.fab.wab.customer.feature.home.domain.model.HomeBanner
import com.fab.wab.customer.feature.home.domain.model.HomeSection
import com.fab.wab.customer.feature.home.domain.model.HomeService

sealed interface HomeContract {

    enum class HomeDialog { LocationExplanation, LocationDenied, AuthRequired }

    /** Nearest section states of PRD S03 item 7. */
    sealed interface NearestUi {
        data object LocationOff : NearestUi
        data object Empty : NearestUi
        data class Salons(val items: List<SalonSummary>, val hasMore: Boolean) : NearestUi
    }

    enum class SalonSection { Recommended, Nearest }

    data class UiState(
        val loading: Boolean = true,
        val refreshing: Boolean = false,
        val offline: Boolean = false,
        val error: String? = null,
        val hasContent: Boolean = false,
        val welcomeName: String = "",
        val signedIn: Boolean = false,
        val unreadCount: Int = 0,
        val gender: Gender? = null,
        val banners: List<HomeBanner> = emptyList(),
        val salonServices: HomeSection<HomeService> = HomeSection(emptyList(), hasMore = false),
        val clinicServices: HomeSection<HomeService> = HomeSection(emptyList(), hasMore = false),
        val recommendedSalons: HomeSection<SalonSummary> = HomeSection(emptyList(), hasMore = false),
        val recommendedClinics: HomeSection<SalonSummary> = HomeSection(emptyList(), hasMore = false),
        val nearestSalons: NearestUi = NearestUi.LocationOff,
        val nearestClinics: NearestUi = NearestUi.LocationOff,
        val dialog: HomeDialog? = null,
    )

    sealed interface UiAction {
        data class OnGenderSelect(val gender: Gender) : UiAction
        data object OnRefresh : UiAction
        data object OnRetry : UiAction
        data object OnResume : UiAction
        data class OnBannerClick(val bannerId: String) : UiAction
        data object OnSearchClick : UiAction
        data object OnNotificationsClick : UiAction
        data class OnServiceClick(val serviceId: String, val businessType: BusinessType = BusinessType.SALON) : UiAction
        data class OnServicesSeeMore(val businessType: BusinessType = BusinessType.SALON) : UiAction
        data class OnSalonClick(val salonId: String, val branchId: String? = null) : UiAction
        data class OnFavoriteClick(val salonId: String) : UiAction
        data class OnSeeAll(val section: SalonSection, val businessType: BusinessType = BusinessType.SALON) : UiAction
        data object OnEnableLocationClick : UiAction
        data object OnDialogConfirm : UiAction
        data object OnDialogDismiss : UiAction
    }

    sealed interface SideEffect {
        data class OpenSalon(val salonId: String, val branchId: String? = null) : SideEffect
        data class OpenAllSalons(
            val gender: Gender,
            val serviceId: String? = null,
            val serviceName: String? = null,
            val filter: SalonListFilter? = null,
            /** Null opens the list for every business type (search). */
            val businessType: BusinessType? = null,
        ) : SideEffect
        data class OpenAllServices(val gender: Gender, val businessType: BusinessType = BusinessType.SALON) : SideEffect
        data object OpenNotifications : SideEffect
        data class OpenUrl(val url: String) : SideEffect
        data object OpenLogin : SideEffect
        data class ShowError(val message: String) : SideEffect
    }
}
