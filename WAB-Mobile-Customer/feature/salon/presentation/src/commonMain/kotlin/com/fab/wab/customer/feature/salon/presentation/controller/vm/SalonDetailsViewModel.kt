package com.fab.wab.customer.feature.salon.presentation.controller.vm

import com.fab.wab.customer.core.analytics.AnalyticsAction
import com.fab.wab.customer.core.analytics.AnalyticsTracker
import com.fab.wab.customer.core.analytics.analyticsParams
import com.fab.wab.customer.core.common.DeepLinks
import com.fab.wab.customer.core.domain.AppError
import com.fab.wab.customer.core.domain.AppResult
import com.fab.wab.customer.core.domain.favorites.FavoritesRepository
import com.fab.wab.customer.core.domain.session.SessionStore
import com.fab.wab.customer.core.mvi.BaseViewModel
import com.fab.wab.customer.core.ui.external.ExternalActions
import com.fab.wab.customer.designsystem.components.feedback.appErrorText
import com.fab.wab.customer.feature.salon.domain.usecase.GetSalonDetailsUseCase
import com.fab.wab.customer.feature.salon.presentation.analytics.SalonAnalytics
import com.fab.wab.customer.feature.salon.presentation.controller.contract.SalonDetailsContract.SalonDialog
import com.fab.wab.customer.feature.salon.presentation.controller.contract.SalonDetailsContract.SideEffect
import com.fab.wab.customer.feature.salon.presentation.controller.contract.SalonDetailsContract.UiAction
import com.fab.wab.customer.feature.salon.presentation.controller.contract.SalonDetailsContract.UiState
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.launch

class SalonDetailsDependencies(
    val getSalonDetails: GetSalonDetailsUseCase,
    val favorites: FavoritesRepository,
    val sessionStore: SessionStore,
    val external: ExternalActions,
    val analytics: AnalyticsTracker,
    val webBaseUrl: String,
    val errorText: suspend (AppError) -> String = ::appErrorText,
)

/** S07: one request, favorite (auth-gated, optimistic), share with the deep link, maps / call / WhatsApp hand-offs. */
class SalonDetailsViewModel(
    private val salonId: String,
    private val deps: SalonDetailsDependencies,
    testScope: CoroutineScope? = null,
) : BaseViewModel<UiState, UiAction, SideEffect>(initialState = UiState(), testScope) {

    private var started = false

    override fun onStart() {
        if (started) return
        started = true
        scope.launch { deps.sessionStore.state.collect { session -> updateState { copy(signedIn = session.isSignedIn) } } }
        load()
    }

    override fun onEvent(event: UiAction) {
        when (event) {
            UiAction.OnRetry -> load()
            UiAction.OnRefresh -> load(refresh = true)
            UiAction.OnShareClick -> share()
            UiAction.OnFavoriteClick -> toggleFavorite()
            UiAction.OnLocationClick -> openMaps()
            UiAction.OnCallClick -> call()
            UiAction.OnWhatsAppClick -> whatsApp()
            UiAction.OnHoursToggle -> updateState { copy(hoursExpanded = !hoursExpanded) }
            UiAction.OnBookClick -> book()
            UiAction.OnDialogConfirm -> confirmDialog()
            UiAction.OnDialogDismiss -> updateState { copy(dialog = null) }
            else -> onNavigation(event)
        }
    }

    private fun call() {
        val phone = salon()?.phone ?: return
        track(SalonAnalytics.ACTION_CALL)
        deps.external.dial(phone)
    }

    private fun whatsApp() {
        val number = salon()?.whatsapp ?: return
        track(SalonAnalytics.ACTION_WHATSAPP)
        deps.external.openWhatsApp(number)
    }

    /** Taps that open another screen or sheet. */
    private fun onNavigation(event: UiAction) {
        when (event) {
            UiAction.OnAddReviewClick -> authGated { emitSideEffect(SideEffect.OpenAddReview(salonId)) }
            is UiAction.OnStaffClick -> emitSideEffect(SideEffect.OpenStaff(salonId, event.memberId))
            is UiAction.OnServiceClick -> emitSideEffect(SideEffect.OpenService(salonId, event.serviceId))
            is UiAction.OnGalleryClick -> emitSideEffect(SideEffect.OpenGallery(salonId, event.index))
            UiAction.OnAllReviewsClick -> emitSideEffect(SideEffect.OpenReviews(salonId))
            else -> Unit
        }
    }

    private fun salon() = uiState.value.salon

    private fun load(refresh: Boolean = false) {
        scope.launch {
            updateState { copy(loading = !refresh, refreshing = refresh, error = null, offline = false) }
            when (val result = deps.getSalonDetails(salonId)) {
                is AppResult.Success -> updateState { copy(loading = false, refreshing = false, salon = result.data) }
                is AppResult.Error -> {
                    val message = deps.errorText(result.appError)
                    val keep = refresh && salon() != null
                    val offline = result.appError is AppError.NetworkError
                    updateState { copy(loading = false, refreshing = false, offline = offline, error = if (keep) null else message) }
                    if (keep) emitSideEffect(SideEffect.ShowError(message))
                }
                AppResult.Loading -> Unit
            }
        }
    }

    /** PRD S07: native share sheet with the salon deep link. */
    private fun share() {
        val salon = salon() ?: return
        track(SalonAnalytics.ACTION_SHARE)
        deps.external.share(shareText(salon.name, DeepLinks.salon(deps.webBaseUrl, salon.id)))
    }

    private fun openMaps() {
        val salon = salon() ?: return
        val location = salon.location ?: return
        track(SalonAnalytics.ACTION_MAPS)
        deps.external.openMaps(location.latitude, location.longitude, salon.name)
    }

    /** Always enabled, even when closed (PRD S07 item 12); guests get the auth dialog. */
    private fun book() = authGated {
        track(SalonAnalytics.ACTION_BOOK)
        emitSideEffect(SideEffect.OpenBooking(salonId))
    }

    private fun toggleFavorite() = authGated {
        val salon = salon() ?: return@authGated
        val target = !salon.isFavorite
        track(SalonAnalytics.ACTION_FAVORITE, SalonAnalytics.PARAM_VALUE to target.toString())
        setFavorite(target)
        scope.launch {
            when (val result = deps.favorites.setFavorite(salon.id, target)) {
                is AppResult.Success -> setFavorite(result.data)
                is AppResult.Error -> {
                    setFavorite(!target)
                    emitSideEffect(SideEffect.ShowError(deps.errorText(result.appError)))
                }
                AppResult.Loading -> Unit
            }
        }
    }

    private fun setFavorite(value: Boolean) = updateState { copy(salon = salon?.copy(isFavorite = value)) }

    private inline fun authGated(action: () -> Unit) {
        if (uiState.value.signedIn) action() else updateState { copy(dialog = SalonDialog.AuthRequired) }
    }

    private fun confirmDialog() {
        val dialog = uiState.value.dialog
        updateState { copy(dialog = null) }
        if (dialog == SalonDialog.AuthRequired) emitSideEffect(SideEffect.OpenLogin)
    }

    private fun track(action: String, vararg params: Pair<String, String>) {
        deps.analytics.trackAction(
            AnalyticsAction(action, analyticsParams { text(SalonAnalytics.PARAM_SALON, salonId); params.forEach { (k, v) -> text(k, v) } }),
        )
    }

}

/** Share payload: the salon name and its link (the platform's share sheet decides the rest). */
fun shareText(name: String, link: String): String = "$name\n$link"
