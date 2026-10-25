package com.fab.wab.merchant.core.notification.state

import androidx.compose.runtime.mutableStateMapOf
import androidx.compose.runtime.snapshots.SnapshotStateMap
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.TextStyle
import androidx.compose.ui.unit.Dp
import com.fab.wab.merchant.core.notification.model.NotificationContent
import com.fab.wab.merchant.core.notification.model.NotificationDefaults
import com.fab.wab.merchant.core.notification.model.NotificationStyle

data class NotificationUiState(
    val notifications: SnapshotStateMap<String, NotificationItemState> = mutableStateMapOf(),
) {
    fun getOrderedNotifications(): List<NotificationItemState> {
        return notifications.toList()
            .sortedByDescending { it.first }
            .map { it.second }
    }
}

data class NotificationItemState(
    val id: String,
    val content: NotificationContent,
    val style: NotificationStyle,
    val bodyTextStyle: TextStyle? = null,
    val titleTextStyle: TextStyle? = null,
    val customContentColor: Color? = null,
    val customBackgroundColor: Color? = null,
    val customCornerRadius: Dp? = null,
    val showDismissButton: Boolean = true,
    val autoDismissDelayMs: Long = NotificationDefaults.AUTO_DISMISS_MS,
    val isVisible: Boolean = false,
)
