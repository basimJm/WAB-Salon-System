package com.fab.wab.merchant.core.notification.model

import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.ui.graphics.Shape

/** Meaning of a banner; its colors come from the app's [NotificationTheme]. */
sealed class NotificationStyle {
    open val shape: Shape get() = RoundedCornerShape(NotificationConstants.CORNER)

    data object Error : NotificationStyle()
    data object Success : NotificationStyle()
    data object Warning : NotificationStyle()
    data object Info : NotificationStyle()
}
