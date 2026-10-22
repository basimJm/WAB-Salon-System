package com.fab.wab.customer.feature.notifications.presentation.screen

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import com.fab.wab.customer.designsystem.components.text.AppText
import com.fab.wab.customer.designsystem.theme.AppTheme
import com.fab.wab.customer.feature.notifications.domain.model.Notification
import com.fab.wab.customer.feature.notifications.presentation.controller.contract.NotificationsContract.UiAction
import com.fab.wab.customer.feature.notifications.presentation.resources.Res
import com.fab.wab.customer.feature.notifications.presentation.resources.notifications_view_booking
import org.jetbrains.compose.resources.stringResource

/** S19 popup (design: bottom sheet): title, icon box + time, full body, "View booking" for booking notifications. */
@Composable
internal fun NotificationPopupSheet(item: Notification, onAction: (UiAction) -> Unit) {
    val colors = AppTheme.colors
    val booking = item.bookingId != null
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
        if (booking) {
            GradientButton(
                text = stringResource(Res.string.notifications_view_booking),
                onClick = { onAction(UiAction.OnViewBooking) },
                modifier = Modifier.fillMaxWidth(),
                height = NotificationsDesign.popupCtaHeight,
                textSize = NotificationsDesign.popupCtaTextSize,
            )
        }
    }
}
