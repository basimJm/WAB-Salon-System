package com.fab.wab.merchant.app.ui

import androidx.compose.runtime.Composable
import com.fab.wab.merchant.app.controller.contract.MainContract.UiAction
import com.fab.wab.merchant.app.controller.contract.MainContract.UiState
import com.fab.wab.merchant.app.ui.system.ForceUpdateScreen
import com.fab.wab.merchant.app.ui.system.MaintenanceScreen
import com.fab.wab.merchant.core.domain.config.LaunchGate
import com.fab.wab.merchant.designsystem.components.dialog.AppGlobalDialog
import com.fab.wab.merchant.designsystem.components.dialog.GlobalDialogKind

/** PRD M01 / M26: splash until the config answers, then maintenance / force update block, an optional update asks once. */
@Composable
internal fun LaunchGateContent(state: UiState, onEvent: (UiAction) -> Unit, content: @Composable () -> Unit) {
    when (val gate = state.gate) {
        null -> SplashScreen(state, onEvent)
        is LaunchGate.Maintenance -> MaintenanceScreen(gate.message, onRetry = { onEvent(UiAction.OnRetryClicked) })
        is LaunchGate.ForceUpdate -> ForceUpdateScreen(onUpdate = { onEvent(UiAction.OnUpdateClicked) })
        is LaunchGate.OptionalUpdate, LaunchGate.Ready -> {
            content()
            if (gate is LaunchGate.OptionalUpdate) {
                AppGlobalDialog(
                    kind = GlobalDialogKind.OptionalUpdate,
                    onConfirm = { onEvent(UiAction.OnUpdateClicked) },
                    onDismiss = { onEvent(UiAction.OnOptionalUpdateDismissed) },
                )
            }
        }
    }
}
