package com.fab.wab.customer.app.ui.system

import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.padding
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import com.fab.wab.customer.app.resources.Res
import com.fab.wab.customer.app.resources.force_update_button
import com.fab.wab.customer.app.resources.force_update_message
import com.fab.wab.customer.app.resources.force_update_title
import com.fab.wab.customer.app.resources.maintenance_message
import com.fab.wab.customer.app.resources.maintenance_retry_button
import com.fab.wab.customer.app.resources.maintenance_title
import com.fab.wab.customer.designsystem.components.feedback.AppStateMessage
import com.fab.wab.customer.designsystem.components.layout.AppScreen
import com.fab.wab.customer.designsystem.icons.AppIcons
import org.jetbrains.compose.resources.stringResource

/** S24 force update: blocking, the only action opens the store. */
@Composable
fun ForceUpdateScreen(onUpdate: () -> Unit, modifier: Modifier = Modifier) {
    SystemScreen(
        title = stringResource(Res.string.force_update_title),
        message = stringResource(Res.string.force_update_message),
        actionText = stringResource(Res.string.force_update_button),
        onAction = onUpdate,
        modifier = modifier,
    )
}

/** S24 maintenance: blocking, the server message when it sends one, retry re-runs the config call. */
@Composable
fun MaintenanceScreen(message: String?, onRetry: () -> Unit, modifier: Modifier = Modifier) {
    SystemScreen(
        title = stringResource(Res.string.maintenance_title),
        message = message ?: stringResource(Res.string.maintenance_message),
        actionText = stringResource(Res.string.maintenance_retry_button),
        onAction = onRetry,
        modifier = modifier,
        icon = AppIcons.Maintenance,
    )
}

@Composable
private fun SystemScreen(
    title: String,
    message: String,
    actionText: String,
    onAction: () -> Unit,
    modifier: Modifier = Modifier,
    icon: androidx.compose.ui.graphics.vector.ImageVector = AppIcons.Refresh,
) {
    AppScreen(modifier = modifier) { padding ->
        Box(Modifier.fillMaxSize().padding(padding), contentAlignment = Alignment.Center) {
            AppStateMessage(icon = icon, title = title, message = message, actionText = actionText, onAction = onAction)
        }
    }
}
