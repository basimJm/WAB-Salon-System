package com.fab.wab.merchant.app.permission

import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import com.fab.wab.merchant.app.permission.AlertsPermissionContract.UiAction
import com.fab.wab.merchant.app.resources.Res
import com.fab.wab.merchant.app.resources.alerts_later
import com.fab.wab.merchant.app.resources.alerts_notifications_allow
import com.fab.wab.merchant.app.resources.alerts_notifications_message
import com.fab.wab.merchant.app.resources.alerts_notifications_title
import com.fab.wab.merchant.app.resources.alerts_overlay_allow
import com.fab.wab.merchant.app.resources.alerts_overlay_message
import com.fab.wab.merchant.app.resources.alerts_overlay_title
import com.fab.wab.merchant.designsystem.components.dialog.AppDialog
import com.fab.wab.merchant.designsystem.icons.AppIcons
import org.jetbrains.compose.resources.stringResource
import org.koin.compose.viewmodel.koinViewModel
import org.koin.core.parameter.parametersOf

/** Signed-in shell: the notification / overlay explanations of [AlertsPermissionViewModel], one at a time. */
@Composable
fun AlertsPermissionPrompt(answersRequests: Boolean) {
    val viewModel: AlertsPermissionViewModel = koinViewModel { parametersOf(answersRequests) }
    val state by viewModel.state.collectAsStateWithLifecycle()
    when (state.step) {
        AlertsStep.NOTIFICATIONS -> AppDialog(
            title = stringResource(Res.string.alerts_notifications_title),
            message = stringResource(Res.string.alerts_notifications_message),
            confirmText = stringResource(Res.string.alerts_notifications_allow),
            dismissText = stringResource(Res.string.alerts_later),
            onConfirm = { viewModel.onEvent(UiAction.OnAllow) },
            onDismiss = { viewModel.onEvent(UiAction.OnLater) },
            icon = AppIcons.Notifications,
            dismissOnOutside = false,
        )
        AlertsStep.OVERLAY -> AppDialog(
            title = stringResource(Res.string.alerts_overlay_title),
            message = stringResource(Res.string.alerts_overlay_message),
            confirmText = stringResource(Res.string.alerts_overlay_allow),
            dismissText = stringResource(Res.string.alerts_later),
            onConfirm = { viewModel.onEvent(UiAction.OnAllow) },
            onDismiss = { viewModel.onEvent(UiAction.OnLater) },
            icon = AppIcons.Bookings,
            dismissOnOutside = false,
        )
        null -> Unit
    }
}
