package com.fab.wab.customer.feature.home.presentation.controller.contract

import com.fab.wab.customer.core.domain.salon.BusinessType
import com.fab.wab.customer.core.domain.salon.SalonSummary
import com.fab.wab.customer.core.domain.session.Gender
import com.fab.wab.customer.core.navigation.route.SalonListFilter
import com.fab.wab.customer.feature.home.domain.model.BookAgainEntry
import com.fab.wab.customer.feature.home.domain.model.HomeBanner
import com.fab.wab.customer.feature.home.domain.model.HomeSection
import com.fab.wab.customer.feature.home.domain.model.HomeService

sealed interface HomeContract {

    enum class HomeDialog { LocationExplanation, LocationDenied, AuthRequired }

    /** Near you states of PRD S03 item 7. */
    sealed interface NearestUi {
        /** Location is allowed and the first fix is on its way: the rest of Home is already shown. */
        data object Locating : NearestUi
        data object LocationOff : NearestUi
        data object Empty : NearestUi
        data class Salons(val items: List<SalonSummary>, val hasMore: Boolean) : NearestUi
    }

    enum class SalonSection { Recommended, Nearest }

    /** The Home sections in the order of BUSINESS_DOMAIN §5.22 (banners → Explore → Near you → Recommended → Book again). */
    enum class HomeBlock { Banners, Explore, NearYou, Recommended, BookAgain }

    data class UiState(
        val loading: Boolean = true,
        val refreshing: Boolean = false,
        val offline: Boolean = false,
        val error: String? = null,
        val hasContent: Boolean = false,
        val welcomeName: String = "",
        val signedIn: Boolean = false,
        val unreadCount: Int = 0,
        /** The stored gender (onboarding / registration): it only selects the banners, never filters businesses (§5.22). */
        val gender: Gender? = null,
        /** The type lens; null = All. */
        val lens: BusinessType? = null,
        val banners: List<HomeBanner> = emptyList(),
        val explore: HomeSection<HomeService> = HomeSection.empty(),
        val nearYou: NearestUi = NearestUi.LocationOff,
        val recommended: HomeSection<SalonSummary> = HomeSection.empty(),
        val bookAgain: List<BookAgainEntry> = emptyList(),
        val dialog: HomeDialog? = null,
    ) {
        /** A reload over shown sections (lens switch): the sections stay and only a small indicator shows. */
        val reloadingContent: Boolean get() = loading && hasContent

        /** The sections to draw, in order; empty ones are left out (Near you always shows: list, empty text or location prompt). */
        val blocks: List<HomeBlock>
            get() = HomeBlock.entries.filter { block ->
                when (block) {
                    HomeBlock.Banners -> banners.isNotEmpty()
                    HomeBlock.Explore -> explore.items.isNotEmpty()
                    HomeBlock.NearYou -> true
                    HomeBlock.Recommended -> recommended.items.isNotEmpty()
                    HomeBlock.BookAgain -> signedIn && bookAgain.isNotEmpty()
                }
            }
    }

    sealed interface UiAction {
        data class OnLensSelect(val lens: BusinessType?) : UiAction
        data object OnRefresh : UiAction
        data object OnRetry : UiAction
        data object OnResume : UiAction
        data class OnBannerClick(val bannerId: String) : UiAction
        data object OnSearchClick : UiAction
        data object OnNotificationsClick : UiAction
        data class OnServiceClick(val serviceId: String) : UiAction
        data object OnServicesSeeMore : UiAction
        data class OnSalonClick(val salonId: String, val branchId: String? = null) : UiAction
        data class OnBookAgainClick(val salonId: String) : UiAction
        data class OnFavoriteClick(val salonId: String) : UiAction
        data class OnSeeAll(val section: SalonSection) : UiAction
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
            /** Null opens the list for every business type (the lens "All"). */
            val businessType: BusinessType? = null,
        ) : SideEffect
        /** Null type = the catalog of every business type. */
        data class OpenAllServices(val gender: Gender, val businessType: BusinessType? = null) : SideEffect
        data object OpenNotifications : SideEffect
        data class OpenUrl(val url: String) : SideEffect
        data object OpenLogin : SideEffect
        data class ShowError(val message: String) : SideEffect
    }
}
