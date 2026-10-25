package com.fab.wab.customer.feature.home.presentation.controller.vm

import com.fab.wab.customer.core.analytics.AnalyticsAction
import com.fab.wab.customer.core.analytics.AnalyticsTracker
import com.fab.wab.customer.core.analytics.analyticsParams
import com.fab.wab.customer.core.domain.AppError
import com.fab.wab.customer.core.domain.AppResult
import com.fab.wab.customer.core.domain.favorites.FavoritesRepository
import com.fab.wab.customer.core.domain.model.LocationData
import com.fab.wab.customer.core.domain.salon.SalonSummary
import com.fab.wab.customer.core.domain.session.Gender
import com.fab.wab.customer.core.domain.session.SessionState
import com.fab.wab.customer.core.domain.session.SessionStore
import com.fab.wab.customer.core.mvi.BaseViewModel
import com.fab.wab.customer.core.notification.push.PushSignals
import com.fab.wab.customer.core.navigation.route.SalonListFilter
import com.fab.wab.customer.core.realtime.RealtimeClient
import com.fab.wab.customer.core.realtime.RealtimeEvents
import com.fab.wab.customer.core.ui.permission.AppPermission
import com.fab.wab.customer.core.ui.permission.PermissionFlow
import com.fab.wab.customer.core.ui.permission.PermissionOutcome
import com.fab.wab.customer.designsystem.components.feedback.appErrorText
import com.fab.wab.customer.feature.home.domain.model.BannerAction
import com.fab.wab.customer.feature.home.domain.model.HomeContent
import com.fab.wab.customer.feature.home.domain.model.HomeSection
import com.fab.wab.customer.feature.home.domain.usecase.GetCurrentLocationUseCase
import com.fab.wab.customer.feature.home.domain.usecase.LoadHomeUseCase
import com.fab.wab.customer.feature.home.presentation.analytics.HomeAnalytics
import com.fab.wab.customer.feature.home.presentation.controller.contract.HomeContract.HomeDialog
import com.fab.wab.customer.feature.home.presentation.controller.contract.HomeContract.NearestUi
import com.fab.wab.customer.feature.home.presentation.controller.contract.HomeContract.SalonSection
import com.fab.wab.customer.feature.home.presentation.controller.contract.HomeContract.SideEffect
import com.fab.wab.customer.feature.home.presentation.controller.contract.HomeContract.UiAction
import com.fab.wab.customer.feature.home.presentation.controller.contract.HomeContract.UiState
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Job
import kotlinx.coroutines.flow.filter
import kotlinx.coroutines.launch
import kotlinx.serialization.json.intOrNull
import kotlinx.serialization.json.jsonObject
import kotlinx.serialization.json.jsonPrimitive

class HomeDependencies(
    val loadHome: LoadHomeUseCase,
    val currentLocation: GetCurrentLocationUseCase,
    val sessionStore: SessionStore,
    val permissions: PermissionFlow,
    val favorites: FavoritesRepository,
    val realtime: RealtimeClient,
    val analytics: AnalyticsTracker,
    val errorText: suspend (AppError) -> String = ::appErrorText,
)

/** S03: one request per gender tab, nearest by permission state, live unread badge, auth-gated favorites. */
class HomeViewModel(
    private val deps: HomeDependencies,
    testScope: CoroutineScope? = null,
) : BaseViewModel<UiState, UiAction, SideEffect>(initialState = UiState(), testScope) {

    private var started = false
    private var loadJob: Job? = null

    override fun onStart() {
        if (started) return
        started = true
        scope.launch { deps.sessionStore.state.collect(::applySession) }
        scope.launch {
            deps.realtime.events.filter { it.name == RealtimeEvents.NOTIFICATIONS_UNREAD }.collect { event ->
                val count = runCatching { event.payload.jsonObject[UNREAD_COUNT_KEY]?.jsonPrimitive?.intOrNull }.getOrNull()
                if (count != null) updateState { copy(unreadCount = count) }
            }
        }
        scope.launch {
            // PRD §10.2: a push shown while the app is open refreshes the badge (the Home payload carries the unread count).
            PushSignals.messages.collect { if (uiState.value.signedIn && uiState.value.hasContent) load(refresh = true) }
        }
    }

    override fun handle(event: UiAction) {
        when (event) {
            is UiAction.OnGenderSelect -> selectGender(event.gender)
            UiAction.OnRefresh -> load(refresh = true)
            UiAction.OnRetry -> load()
            UiAction.OnResume -> resumeAfterSettings()
            is UiAction.OnFavoriteClick -> toggleFavorite(event.salonId)
            UiAction.OnEnableLocationClick -> {
                track(HomeAnalytics.ACTION_ENABLE_LOCATION)
                updateState { copy(dialog = HomeDialog.LocationExplanation) }
            }
            UiAction.OnDialogConfirm -> confirmDialog()
            UiAction.OnDialogDismiss -> updateState { copy(dialog = null) }
            else -> onNavigation(event)
        }
    }

    /** Taps that only leave the screen. */
    private fun onNavigation(event: UiAction) {
        when (event) {
            is UiAction.OnBannerClick -> openBanner(event.bannerId)
            UiAction.OnSearchClick -> {
                track(HomeAnalytics.ACTION_SEARCH_CLICK)
                openSalons()
            }
            UiAction.OnNotificationsClick -> emitSideEffect(SideEffect.OpenNotifications)
            is UiAction.OnServiceClick -> {
                track(HomeAnalytics.ACTION_SERVICE_CLICK, HomeAnalytics.PARAM_ID to event.serviceId)
                val name = uiState.value.services.items.firstOrNull { it.id == event.serviceId }?.name
                openSalons(serviceId = event.serviceId, serviceName = name)
            }
            UiAction.OnServicesSeeMore -> uiState.value.gender?.let { emitSideEffect(SideEffect.OpenAllServices(it)) }
            is UiAction.OnSalonClick -> {
                track(HomeAnalytics.ACTION_SALON_CLICK, HomeAnalytics.PARAM_ID to event.salonId)
                emitSideEffect(SideEffect.OpenSalon(event.salonId, event.branchId))
            }
            is UiAction.OnSeeAll -> openSalons(filter = event.section.filter())
            else -> Unit
        }
    }

    /** S04 always opens for the gender of the selected tab (PRD S04 "selected gender"). */
    private fun openSalons(serviceId: String? = null, serviceName: String? = null, filter: SalonListFilter? = null) {
        val gender = uiState.value.gender ?: return
        emitSideEffect(SideEffect.OpenAllSalons(gender, serviceId, serviceName, filter))
    }

    private fun applySession(session: SessionState) {
        val previous = uiState.value
        val name = when (session) {
            is SessionState.Guest -> session.profile.nickname.orEmpty()
            is SessionState.SignedIn -> session.user.firstName
        }
        val gender = previous.gender ?: session.genderScope ?: Gender.entries.first()
        updateState {
            copy(
                welcomeName = name,
                signedIn = session.isSignedIn,
                gender = gender,
                unreadCount = if (session.isSignedIn) unreadCount else 0,
            )
        }
        if (previous.gender == null || previous.signedIn != session.isSignedIn) load()
    }

    private fun selectGender(gender: Gender) {
        if (gender == uiState.value.gender) return
        track(HomeAnalytics.ACTION_GENDER_TAB, HomeAnalytics.PARAM_GENDER to gender.code.lowercase())
        updateState { copy(gender = gender, hasContent = false) }
        load()
    }

    private fun load(refresh: Boolean = false) {
        val gender = uiState.value.gender ?: return
        loadJob?.cancel()
        loadJob = scope.launch {
            updateState { copy(loading = !refresh, refreshing = refresh, error = null, offline = false) }
            val location = currentLocationIfAllowed()
            when (val result = deps.loadHome(gender, location)) {
                is AppResult.Success -> apply(result.data, located = location != null)
                is AppResult.Error -> {
                    val message = deps.errorText(result.appError)
                    val keepContent = uiState.value.hasContent
                    updateState {
                        copy(loading = false, refreshing = false, offline = result.appError is AppError.NetworkError, error = message)
                    }
                    if (keepContent) emitSideEffect(SideEffect.ShowError(message))
                }
                AppResult.Loading -> Unit
            }
        }
    }

    private fun apply(content: HomeContent, located: Boolean) = updateState {
        copy(
            loading = false,
            refreshing = false,
            hasContent = true,
            banners = content.banners,
            services = content.services,
            recommended = content.recommended,
            nearest = nearestOf(content.nearest, located),
            unreadCount = if (signedIn) content.unreadCount else 0,
        )
    }

    private suspend fun currentLocationIfAllowed(): LocationData? =
        if (deps.permissions.isGranted(AppPermission.LOCATION) && deps.permissions.isLocationServiceEnabled()) {
            deps.currentLocation()
        } else {
            null
        }

    /** Back from the system settings (PRD S03 item 7 "after enabling → loads automatically"). */
    private fun resumeAfterSettings() {
        if (uiState.value.nearest !is NearestUi.LocationOff || !uiState.value.hasContent) return
        scope.launch { if (currentLocationIfAllowed() != null) load(refresh = true) }
    }

    private fun confirmDialog() {
        val dialog = uiState.value.dialog
        updateState { copy(dialog = null) }
        when (dialog) {
            HomeDialog.LocationExplanation -> requestLocation()
            HomeDialog.LocationDenied -> deps.permissions.openSettings(AppPermission.LOCATION)
            HomeDialog.AuthRequired -> emitSideEffect(SideEffect.OpenLogin)
            null -> Unit
        }
    }

    private fun requestLocation() {
        scope.launch {
            when (deps.permissions.ensure(AppPermission.LOCATION)) {
                PermissionOutcome.Granted ->
                    if (deps.permissions.isLocationServiceEnabled()) {
                        load(refresh = true)
                    } else {
                        deps.permissions.openLocationServiceSettings()
                    }
                PermissionOutcome.Denied -> Unit
                PermissionOutcome.BlockedInSettings -> updateState { copy(dialog = HomeDialog.LocationDenied) }
            }
        }
    }

    private fun openBanner(bannerId: String) {
        val banner = uiState.value.banners.firstOrNull { it.id == bannerId } ?: return
        track(HomeAnalytics.ACTION_BANNER_CLICK, HomeAnalytics.PARAM_ID to bannerId)
        when (val action = banner.action) {
            is BannerAction.Salon -> emitSideEffect(SideEffect.OpenSalon(action.salonId))
            is BannerAction.ExternalUrl -> emitSideEffect(SideEffect.OpenUrl(action.url))
            BannerAction.None -> Unit
        }
    }

    private fun toggleFavorite(salonId: String) {
        if (!uiState.value.signedIn) {
            updateState { copy(dialog = HomeDialog.AuthRequired) }
            return
        }
        val current = uiState.value.salon(salonId) ?: return
        val target = !current.isFavorite
        track(HomeAnalytics.ACTION_FAVORITE, HomeAnalytics.PARAM_ID to salonId, HomeAnalytics.PARAM_VALUE to target.toString())
        setFavorite(salonId, target)
        scope.launch {
            when (val result = deps.favorites.setFavorite(salonId, target)) {
                is AppResult.Success -> setFavorite(salonId, result.data)
                is AppResult.Error -> {
                    setFavorite(salonId, !target)
                    emitSideEffect(SideEffect.ShowError(deps.errorText(result.appError)))
                }
                AppResult.Loading -> Unit
            }
        }
    }

    private fun setFavorite(salonId: String, value: Boolean) = updateState {
        copy(
            recommended = recommended.mapSalon(salonId) { it.copy(isFavorite = value) },
            nearest = (nearest as? NearestUi.Salons)?.let { it.copy(items = it.items.replace(salonId) { s -> s.copy(isFavorite = value) }) }
                ?: nearest,
        )
    }

    private fun track(action: String, vararg params: Pair<String, String>) {
        deps.analytics.trackAction(AnalyticsAction(action, analyticsParams { params.forEach { (k, v) -> text(k, v) } }))
    }

    private companion object {
        /** BUSINESS_DOMAIN §7: `notifications.unread` carries `{count}`. */
        const val UNREAD_COUNT_KEY = "count"
    }
}

private fun nearestOf(section: HomeSection<SalonSummary>?, located: Boolean): NearestUi = when {
    !located -> NearestUi.LocationOff
    section == null || section.items.isEmpty() -> NearestUi.Empty
    else -> NearestUi.Salons(section.items, section.hasMore)
}

private fun SalonSection.filter(): SalonListFilter = when (this) {
    SalonSection.Recommended -> SalonListFilter.RECOMMENDED
    SalonSection.Nearest -> SalonListFilter.NEAREST
}

private fun UiState.salon(id: String): SalonSummary? =
    recommended.items.firstOrNull { it.id == id } ?: (nearest as? NearestUi.Salons)?.items?.firstOrNull { it.id == id }

private fun HomeSection<SalonSummary>.mapSalon(id: String, transform: (SalonSummary) -> SalonSummary) =
    copy(items = items.replace(id, transform))

private fun List<SalonSummary>.replace(id: String, transform: (SalonSummary) -> SalonSummary) =
    map { if (it.id == id) transform(it) else it }
