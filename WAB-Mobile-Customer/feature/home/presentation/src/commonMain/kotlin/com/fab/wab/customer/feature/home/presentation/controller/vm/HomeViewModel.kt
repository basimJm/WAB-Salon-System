package com.fab.wab.customer.feature.home.presentation.controller.vm

import com.fab.wab.customer.core.analytics.AnalyticsAction
import com.fab.wab.customer.core.analytics.AnalyticsTracker
import com.fab.wab.customer.core.analytics.analyticsParams
import com.fab.wab.customer.core.domain.AppError
import com.fab.wab.customer.core.domain.AppLanguage
import com.fab.wab.customer.core.domain.AppResult
import com.fab.wab.customer.core.domain.favorites.FavoritesRepository
import com.fab.wab.customer.core.domain.model.LocationData
import com.fab.wab.customer.core.domain.salon.BusinessType
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
import com.fab.wab.customer.feature.home.domain.usecase.GetCurrentLocationUseCase
import com.fab.wab.customer.feature.home.domain.usecase.LoadHomeUseCase
import com.fab.wab.customer.feature.home.presentation.analytics.HomeAnalytics
import com.fab.wab.customer.feature.home.presentation.controller.contract.HomeContract.HomeDialog
import com.fab.wab.customer.feature.home.presentation.controller.contract.HomeContract.NearestUi
import com.fab.wab.customer.feature.home.presentation.controller.contract.HomeContract.SideEffect
import com.fab.wab.customer.feature.home.presentation.controller.contract.HomeContract.UiAction
import com.fab.wab.customer.feature.home.presentation.controller.contract.HomeContract.UiState
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Job
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.distinctUntilChanged
import kotlinx.coroutines.flow.drop
import kotlinx.coroutines.flow.emptyFlow
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
    /** The app language: server content is localized by `Accept-Language`, so a switch reloads Home (CUS-092). */
    val languageChanges: Flow<AppLanguage> = emptyFlow(),
)

/** S03: one request per type lens (§5.22), Near you by permission state, live unread badge, auth-gated favorites. */
class HomeViewModel(private val deps: HomeDependencies, testScope: CoroutineScope? = null) :
    BaseViewModel<UiState, UiAction, SideEffect>(initialState = UiState(), testScope) {

    private var started = false
    private var loadJob: Job? = null

    /** The last fix of this screen: later loads (lens, refresh) send it at once instead of waiting for a new one. */
    private var lastFix: LocationData? = null

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
        scope.launch { deps.languageChanges.distinctUntilChanged().drop(1).collect { if (uiState.value.hasContent) load(refresh = true) } }
        scope.launch {
            // PRD §10.2: a push shown while the app is open refreshes the badge (the Home payload carries the unread count).
            PushSignals.messages.collect { if (uiState.value.signedIn && uiState.value.hasContent) load(refresh = true) }
        }
    }

    override fun handle(event: UiAction) {
        when (event) {
            is UiAction.OnLensSelect -> selectLens(event.lens)
            UiAction.OnRefresh -> load(refresh = true)
            UiAction.OnRetry -> load()
            UiAction.OnResume -> resumeAfterSettings()
            is UiAction.OnFavoriteClick -> toggleFavorite(event.salonId)
            UiAction.OnEnableLocationClick -> {
                track(HomeAnalytics.ACTION_ENABLE_LOCATION)
                updateState { copy(dialog = HomeDialog.LocationExplanation) }
            }
            UiAction.OnRetryLocationClick -> retryLocation()
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
                val service = uiState.value.explore.items.firstOrNull { it.id == event.serviceId }
                openSalons(serviceId = event.serviceId, serviceName = service?.name, businessType = service?.businessType)
            }
            UiAction.OnServicesSeeMore ->
                uiState.value.gender?.let { emitSideEffect(SideEffect.OpenAllServices(it, uiState.value.lens)) }
            is UiAction.OnSalonClick -> {
                track(HomeAnalytics.ACTION_SALON_CLICK, HomeAnalytics.PARAM_ID to event.salonId)
                emitSideEffect(SideEffect.OpenSalon(event.salonId, event.branchId))
            }
            is UiAction.OnBookAgainClick -> {
                // The booking flow has no service preselection yet: Book again opens the business (§5.22).
                track(HomeAnalytics.ACTION_BOOK_AGAIN, HomeAnalytics.PARAM_ID to event.salonId)
                emitSideEffect(SideEffect.OpenSalon(event.salonId))
            }
            is UiAction.OnSeeAll -> openSalons(filter = event.section.filter(), businessType = uiState.value.lens)
            else -> Unit
        }
    }

    /** S04 opens with the Home lens (or the tapped service's type); the route still carries the stored gender. */
    private fun openSalons(
        serviceId: String? = null,
        serviceName: String? = null,
        filter: SalonListFilter? = null,
        businessType: BusinessType? = null,
    ) {
        val gender = uiState.value.gender ?: return
        emitSideEffect(SideEffect.OpenAllSalons(gender, serviceId, serviceName, filter, businessType))
    }

    private fun applySession(session: SessionState) {
        val previous = uiState.value
        val name = when (session) {
            is SessionState.Guest -> session.profile.nickname.orEmpty()
            is SessionState.SignedIn -> session.user.firstName
        }
        // No gender toggle on Home any more (§5.22): the stored gender follows the session and only picks the banners.
        val gender = session.genderScope ?: previous.gender ?: Gender.entries.first()
        updateState {
            copy(
                welcomeName = name,
                signedIn = session.isSignedIn,
                gender = gender,
                unreadCount = if (session.isSignedIn) unreadCount else 0,
            )
        }
        if (previous.gender != gender || previous.signedIn != session.isSignedIn) load()
    }

    /** The lens filters every section at once: one new request with `businessType` (BUSINESS_DOMAIN §5.22). */
    private fun selectLens(lens: BusinessType?) {
        if (lens == uiState.value.lens) return
        track(HomeAnalytics.ACTION_LENS, HomeAnalytics.PARAM_TYPE to (lens?.code ?: HomeAnalytics.VALUE_ALL).lowercase())
        // The sections of the previous lens stay on screen while the new lens loads (a small indicator, no skeleton).
        updateState { copy(lens = lens) }
        load()
    }

    private fun load(refresh: Boolean = false) {
        val gender = uiState.value.gender ?: return
        val lens = uiState.value.lens
        loadJob?.cancel()
        loadJob = scope.launch {
            updateState { copy(loading = !refresh, refreshing = refresh, error = null, offline = false) }
            // Home never waits for a GPS fix (it may take the whole timeout): the sections load at once with the last
            // fix of this screen, and Near you fills in when a first fix arrives.
            val allowed = locationAllowed()
            val known = lastFix.takeIf { allowed }
            when (val result = deps.loadHome(gender, lens, known)) {
                is AppResult.Success -> {
                    apply(result.data, located = known != null)
                    if (allowed && known == null) locateThenFillNearYou(gender, lens)
                }
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

    private fun apply(content: HomeContent, located: Boolean) = updateState { withContent(content, located) }

    private suspend fun locationAllowed(): Boolean =
        deps.permissions.isGranted(AppPermission.LOCATION) && deps.permissions.isLocationServiceEnabled()

    private suspend fun currentLocationIfAllowed(): LocationData? =
        if (locationAllowed()) deps.currentLocation()?.also { lastFix = it } else null

    /** Placeholder until the first fix, which reloads Home; no fix = Unavailable (retry), or LocationOff if turned off. */
    private suspend fun locateThenFillNearYou(gender: Gender, lens: BusinessType?) {
        updateState { copy(nearYou = NearestUi.Locating) }
        val fix = currentLocationIfAllowed()
        if (fix == null) {
            val near = if (locationAllowed()) NearestUi.Unavailable else NearestUi.LocationOff
            return updateState { copy(nearYou = near) }
        }
        (deps.loadHome(gender, lens, fix) as? AppResult.Success)?.let { apply(it.data, located = true) }
    }

    private fun retryLocation() {
        track(HomeAnalytics.ACTION_RETRY_LOCATION)
        uiState.value.gender?.let { gender -> scope.launch { locateThenFillNearYou(gender, uiState.value.lens) } }
    }

    /** Back from the system settings (PRD S03 item 7 "after enabling → loads automatically"). */
    private fun resumeAfterSettings() {
        val near = uiState.value.nearYou
        if ((near !is NearestUi.LocationOff && near !is NearestUi.Unavailable) || !uiState.value.hasContent) return
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

    private fun setFavorite(salonId: String, value: Boolean) = updateState { withFavorite(salonId, value) }

    private fun track(action: String, vararg params: Pair<String, String>) {
        deps.analytics.trackAction(AnalyticsAction(action, analyticsParams { params.forEach { (k, v) -> text(k, v) } }))
    }

    private companion object {
        /** BUSINESS_DOMAIN §7: `notifications.unread` carries `{count}`. */
        const val UNREAD_COUNT_KEY = "count"
    }
}
