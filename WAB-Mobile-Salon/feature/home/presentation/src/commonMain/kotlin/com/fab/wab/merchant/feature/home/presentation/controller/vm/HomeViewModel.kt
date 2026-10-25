package com.fab.wab.merchant.feature.home.presentation.controller.vm

import com.fab.wab.merchant.core.analytics.AnalyticsAction
import com.fab.wab.merchant.core.analytics.AnalyticsTracker
import com.fab.wab.merchant.core.analytics.analyticsParams
import com.fab.wab.merchant.core.domain.AppError
import com.fab.wab.merchant.core.domain.AppResult
import com.fab.wab.merchant.core.domain.permission.Permission
import com.fab.wab.merchant.core.domain.permission.permissionSet
import com.fab.wab.merchant.core.domain.session.SessionState
import com.fab.wab.merchant.core.mvi.BaseViewModel
import com.fab.wab.merchant.designsystem.components.feedback.appErrorText
import com.fab.wab.merchant.feature.home.domain.DashboardRepository
import com.fab.wab.merchant.feature.home.presentation.analytics.HomeAnalytics
import com.fab.wab.merchant.feature.home.presentation.controller.contract.HomeContract.SideEffect
import com.fab.wab.merchant.feature.home.presentation.controller.contract.HomeContract.UiAction
import com.fab.wab.merchant.feature.home.presentation.controller.contract.HomeContract.UiState
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Job
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.emptyFlow
import kotlinx.coroutines.flow.launchIn
import kotlinx.coroutines.flow.onEach
import kotlinx.coroutines.launch

class HomeDependencies(
    val dashboard: DashboardRepository,
    val session: Flow<SessionState>,
    /** PRD M07: pull-to-refresh also re-fetches the member's permissions (`PermissionsSync.refresh`). */
    val refreshPermissions: suspend () -> Unit,
    val analytics: AnalyticsTracker,
    /** Wall clock ticks (epoch ms) for the request ages and countdowns. */
    val clock: Flow<Long>,
    /** Socket booking events: the dashboard reloads silently. */
    val bookingChanges: Flow<Unit> = emptyFlow(),
    val errorText: suspend (AppError) -> String = ::appErrorText,
)

/**
 * PRD M07 Home: one `GET /dashboard` for the whole screen (unified shimmer), error + retry, pull-to-refresh that
 * also refreshes permissions, blocks shown per permission, live reload on booking events.
 */
class HomeViewModel(
    private val deps: HomeDependencies,
    testScope: CoroutineScope? = null,
) : BaseViewModel<UiState, UiAction, SideEffect>(initialState = UiState(), testScope) {

    private var loadJob: Job? = null

    override fun onStart() {
        deps.session.onEach { session ->
            val permissions = session.permissionSet()
            updateState {
                copy(
                    memberName = (session as? SessionState.SignedIn)?.member?.firstName.orEmpty(),
                    canRespond = permissions.has(Permission.BOOKINGS_RESPOND),
                    canSeeStatistics = permissions.has(Permission.STATISTICS_VIEW),
                    canSeeSubscription = permissions.has(Permission.SUBSCRIPTION_VIEW),
                    ownBookingsOnly = !permissions.has(Permission.BOOKINGS_VIEW_ALL),
                )
            }
        }.launchIn(scope)
        deps.clock.onEach { now -> updateState { copy(nowMs = now) } }.launchIn(scope)
        deps.bookingChanges.onEach { load(Mode.SILENT) }.launchIn(scope)
        load(Mode.FIRST)
    }

    override fun handle(event: UiAction) {
        when (event) {
            UiAction.OnRefresh -> {
                deps.analytics.trackAction(AnalyticsAction(HomeAnalytics.ACTION_REFRESH))
                scope.launch {
                    updateState { copy(refreshing = true) }
                    deps.refreshPermissions()
                    load(Mode.REFRESH)
                }
            }
            UiAction.OnRetry -> load(Mode.FIRST)
            UiAction.OnResume -> if (uiState.value.dashboard != null) load(Mode.SILENT)
            UiAction.OnNotifications -> open(HomeAnalytics.TARGET_NOTIFICATIONS, SideEffect.OpenNotifications)
            is UiAction.OnBooking -> open(HomeAnalytics.TARGET_BOOKING, SideEffect.OpenBooking(event.bookingId))
            UiAction.OnViewAllRequests -> open(HomeAnalytics.TARGET_REQUESTS, SideEffect.OpenPendingRequests)
            UiAction.OnSubscription -> if (uiState.value.canSeeSubscription) {
                open(HomeAnalytics.TARGET_SUBSCRIPTION, SideEffect.OpenSubscription)
            }
            UiAction.OnSetup -> open(HomeAnalytics.TARGET_SETUP, SideEffect.OpenSetup)
            UiAction.OnCalendar -> open(HomeAnalytics.TARGET_CALENDAR, SideEffect.OpenCalendar)
        }
    }

    private fun open(target: String, effect: SideEffect) {
        deps.analytics.trackAction(
            AnalyticsAction(HomeAnalytics.ACTION_OPEN, analyticsParams { text(HomeAnalytics.PARAM_TARGET, target) }),
        )
        emitSideEffect(effect)
    }

    /** FIRST shows the shimmer / error state; REFRESH and SILENT keep the content and report a failure as a banner. */
    private enum class Mode { FIRST, REFRESH, SILENT }

    private fun load(mode: Mode) {
        loadJob?.cancel()
        loadJob = scope.launch {
            if (mode == Mode.FIRST) updateState { copy(loading = true, error = null) }
            when (val result = deps.dashboard.dashboard()) {
                is AppResult.Success -> updateState { copy(dashboard = result.data, loading = false, refreshing = false, error = null) }
                is AppResult.Error -> {
                    val message = deps.errorText(result.appError)
                    val keepContent = uiState.value.dashboard != null
                    updateState {
                        copy(loading = false, refreshing = false, error = if (keepContent) error else message)
                    }
                    if (keepContent && mode != Mode.SILENT) emitSideEffect(SideEffect.ShowError(message))
                }
                AppResult.Loading -> Unit
            }
        }
    }
}
