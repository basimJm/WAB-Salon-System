package com.fab.wab.merchant.feature.notifications.presentation.screen

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import com.fab.wab.merchant.designsystem.components.text.AppText
import com.fab.wab.merchant.designsystem.theme.AppTheme
import com.fab.wab.merchant.feature.notifications.domain.model.Notification
import com.fab.wab.merchant.feature.notifications.presentation.controller.contract.NotificationsContract.UiAction
import com.fab.wab.merchant.feature.notifications.presentation.resources.Res
import com.fab.wab.merchant.feature.notifications.presentation.resources.notifications_open
import com.fab.wab.merchant.feature.notifications.presentation.resources.notifications_view_booking
import com.fab.wab.merchant.feature.notifications.domain.model.NotificationTarget
import com.fab.wab.merchant.feature.notifications.domain.model.target
import org.jetbrains.compose.resources.stringResource

/** M24 popup (bottom sheet): title, icon box + time, full body, and "View booking" / "Open" when it leads somewhere. */
@Composable
internal fun NotificationPopupSheet(item: Notification, onAction: (UiAction) -> Unit) {
    val colors = AppTheme.colors
    val target = item.target()
    val booking = target is NotificationTarget.Booking
    NotificationsSheet(title = item.title, onDismiss = { onAction(UiAction.OnPopupDismiss) }) {
        Row(
            modifier = Modifier.fillMaxWidth().padding(bottom = NotificationsDesign.popupHeaderBottom),
            horizontalArrangement = Arrangement.spacedBy(AppTheme.spacing.space12),
            verticalAlignment = Alignment.Top,
        ) {
            NotificationIconBox(isBooking = booking)
            AppText(
                text = relativeText(item.createdAt),
                style = AppTheme.typography.bodySmall.copy(fontSize = NotificationsDesign.popupTimeSize),
                color = colors.faint,
                modifier = Modifier.padding(top = NotificationsDesign.popupTimeTop),
            )
        }
        AppText(
            text = item.body,
            style = AppTheme.typography.bodyMedium.copy(
                fontSize = NotificationsDesign.popupBodySize,
                lineHeight = NotificationsDesign.popupBodyLineHeight,
            ),
            color = colors.muted,
            modifier = Modifier.padding(bottom = NotificationsDesign.popupBodyBottom),
        )
        if (target != null) {
            GradientButton(
                text = stringResource(if (booking) Res.string.notifications_view_booking else Res.string.notifications_open),
                onClick = { onAction(UiAction.OnOpenTarget) },
                modifier = Modifier.fillMaxWidth(),
                height = NotificationsDesign.popupCtaHeight,
                textSize = NotificationsDesign.popupCtaTextSize,
            )
        }
    }
}
