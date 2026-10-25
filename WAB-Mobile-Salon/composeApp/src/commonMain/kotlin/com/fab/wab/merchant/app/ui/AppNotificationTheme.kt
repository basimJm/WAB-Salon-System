package com.fab.wab.merchant.app.ui

import androidx.compose.runtime.Composable
import com.fab.wab.merchant.core.notification.model.NotificationColors
import com.fab.wab.merchant.core.notification.model.NotificationTheme
import com.fab.wab.merchant.designsystem.icons.AppIcons
import com.fab.wab.merchant.designsystem.resources.Res
import com.fab.wab.merchant.designsystem.resources.common_close
import com.fab.wab.merchant.designsystem.theme.AppTheme
import org.jetbrains.compose.resources.stringResource

/** In-app banner look from the design system tokens (light and dark follow the theme). */
@Composable
fun appNotificationTheme(): NotificationTheme {
    val colors = AppTheme.colors
    return NotificationTheme(
        info = NotificationColors(colors.accent, colors.onAccent),
        success = NotificationColors(colors.successContainer, colors.onSuccessContainer),
        warning = NotificationColors(colors.warningContainer, colors.onWarningContainer),
        error = NotificationColors(colors.danger, colors.onGradient),
        closeIcon = AppIcons.Close,
        closeLabel = stringResource(Res.string.common_close),
    )
}
