package com.fab.wab.merchant.core.notification.model

import androidx.compose.runtime.Immutable
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.vector.ImageVector

/** Background + content color of one banner style. */
@Immutable
data class NotificationColors(val background: Color, val content: Color)

/**
 * Look of the in-app banners, supplied by the app shell from its design system (this module sits below the
 * design system, so it never reads theme tokens itself): colors per style and the dismiss icon with its label.
 */
@Immutable
data class NotificationTheme(
    val info: NotificationColors,
    val success: NotificationColors,
    val warning: NotificationColors,
    val error: NotificationColors,
    val closeIcon: ImageVector,
    val closeLabel: String,
) {
    fun colorsOf(style: NotificationStyle): NotificationColors = when (style) {
        NotificationStyle.Info -> info
        NotificationStyle.Success -> success
        NotificationStyle.Warning -> warning
        NotificationStyle.Error -> error
    }
}
