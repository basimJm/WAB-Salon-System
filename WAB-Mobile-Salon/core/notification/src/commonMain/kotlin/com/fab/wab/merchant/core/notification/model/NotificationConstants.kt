package com.fab.wab.merchant.core.notification.model

import androidx.compose.ui.unit.dp

/** Defaults shared by the notification API, events and state. */
object NotificationDefaults {
    /** How long a banner stays before it dismisses itself. */
    const val AUTO_DISMISS_MS = 5_000L
}

/** Banner geometry (dimensions live in a constants file; the module sits below the design system). */
object NotificationConstants {
    val CORNER = 12.dp
    val PADDING = 12.dp
    val GAP_SMALL = 4.dp
    val GAP = 8.dp
    val DISMISS_SPACE = 32.dp
    val MAX_WIDTH = 560.dp
}
