package com.fab.wab.merchant.app.permission

import com.fab.wab.merchant.core.domain.session.SessionStore
import com.fab.wab.merchant.core.mvi.BaseViewModel
import com.fab.wab.merchant.core.ui.permission.AppPermission
import com.fab.wab.merchant.core.ui.permission.OverlayPermission
import com.fab.wab.merchant.core.ui.permission.PermissionFlow
import com.fab.wab.merchant.core.ui.permission.PermissionManager
import com.fab.wab.merchant.core.ui.permission.PermissionStatus
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.flow.first
import kotlinx.coroutines.launch

/** The explanation shown before a system permission screen (PRD M10, §11). */
enum class AlertsStep {
    /** Android 13+ notification permission: booking requests, reminders and alerts arrive as notifications. */
    NOTIFICATIONS,

    /** Android "Display over other apps": the full request card over other apps (once per install). */
    OVERLAY,
}

object AlertsPermissionContract {
    data class UiState(val step: AlertsStep? = null)

    sealed interface UiAction {
        data object OnAllow : UiAction
        data object OnLater : UiAction
    }

    sealed interface SideEffect
}

/**
 * After sign-in: explains and asks for notifications while the system can still ask (nothing was ever requested on
 * Android 13+, so no notification reached a merchant), then — once per install, for members who answer requests —
 * the "display over other apps" setting. iOS asks for notifications at launch, so its status is already settled.
 */
class AlertsPermissionViewModel(
    private val permissions: PermissionFlow,
    private val manager: PermissionManager,
    private val overlay: OverlayPermission,
    private val session: SessionStore,
    private val answersRequests: Boolean,
    testScope: CoroutineScope? = null,
) : BaseViewModel<AlertsPermissionContract.UiState, AlertsPermissionContract.UiAction, AlertsPermissionContract.SideEffect>(
    initialState = AlertsPermissionContract.UiState(),
    testScope,
) {
    private var started = false

    override fun onStart() {
        if (started) return
        started = true
        scope.launch {
            if (manager.status(AppPermission.NOTIFICATIONS) == PermissionStatus.DENIED) {
                updateState { copy(step = AlertsStep.NOTIFICATIONS) }
            } else {
                offerOverlay()
            }
        }
    }

    override fun handle(event: AlertsPermissionContract.UiAction) {
        val step = uiState.value.step ?: return
        updateState { copy(step = null) }
        scope.launch {
            when (step) {
                AlertsStep.NOTIFICATIONS -> {
                    if (event == AlertsPermissionContract.UiAction.OnAllow) permissions.ensure(AppPermission.NOTIFICATIONS)
                    offerOverlay()
                }
                AlertsStep.OVERLAY -> {
                    session.setOverlayPermissionPrompted(true)
                    if (event == AlertsPermissionContract.UiAction.OnAllow) overlay.openSettings()
                }
            }
        }
    }

    private suspend fun offerOverlay() {
        val due = answersRequests && overlay.isSupported && !overlay.isGranted() && !session.overlayPermissionPrompted.first()
        if (due) updateState { copy(step = AlertsStep.OVERLAY) }
    }
}
