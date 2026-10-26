package com.fab.wab.customer.feature.notifications.presentation.screen

import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.semantics.Role
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextOverflow
import com.fab.wab.customer.core.common.BusinessTime
import com.fab.wab.customer.core.common.TimeFormat
import com.fab.wab.customer.designsystem.components.glass.glassBackground
import com.fab.wab.customer.designsystem.components.text.AppText
import com.fab.wab.customer.designsystem.theme.AppTheme
import com.fab.wab.customer.designsystem.theme.GlassStyle
import com.fab.wab.customer.feature.notifications.domain.model.Notification
import com.fab.wab.customer.feature.notifications.domain.model.RelativeTime
import com.fab.wab.customer.feature.notifications.domain.model.relativeTimeOf
import com.fab.wab.customer.feature.notifications.presentation.resources.Res
import com.fab.wab.customer.feature.notifications.presentation.resources.time_days_ago
import com.fab.wab.customer.feature.notifications.presentation.resources.time_hours_ago
import com.fab.wab.customer.feature.notifications.presentation.resources.time_minutes_ago
import com.fab.wab.customer.feature.notifications.presentation.resources.time_now
import com.fab.wab.customer.feature.notifications.presentation.resources.time_yesterday
import org.jetbrains.compose.resources.pluralStringResource
import org.jetbrains.compose.resources.stringResource

/**
 * S19 list item (`padding:14px;border-radius:16px;gap:12px`): icon box, title + time, two-line body; unread rows use the
 * soft background, a violet border and a dot at the end.
 */
@Composable
internal fun NotificationRow(item: Notification, onClick: () -> Unit, modifier: Modifier = Modifier) {
    val colors = AppTheme.colors
    val spacing = AppTheme.spacing
    val shape = AppTheme.shapes.large
    val unread = !item.isRead
    val borderColor = if (unread) colors.gradientEnd.copy(alpha = NotificationsDesign.unreadBorderAlpha) else colors.line
    Row(
        modifier = modifier
            .fillMaxWidth()
            .clip(shape)
            .glassBackground(
                AppTheme.glass,
                shape,
                style = if (unread) GlassStyle.Prominent else GlassStyle.Regular,
                stateBorder = borderColor,
            )
            .clickable(role = Role.Button, onClick = onClick)
            .padding(NotificationsDesign.itemPadding),
        horizontalArrangement = Arrangement.spacedBy(spacing.space12),
        verticalAlignment = Alignment.Top,
    ) {
        NotificationIconBox(isBooking = item.bookingId != null)
        Column(modifier = Modifier.weight(1f)) {
            Row(horizontalArrangement = Arrangement.spacedBy(spacing.space8), verticalAlignment = Alignment.Top) {
                AppText(
                    text = item.title,
                    style = AppTheme.typography.titleSmall.copy(
                        fontSize = NotificationsDesign.titleSize,
                        lineHeight = NotificationsDesign.titleLineHeight,
                        fontWeight = if (unread) FontWeight.Bold else FontWeight.SemiBold,
                    ),
                    modifier = Modifier.weight(1f),
                )
                AppText(
                    text = relativeText(item.createdAt),
                    style = AppTheme.typography.bodySmall.copy(fontSize = NotificationsDesign.timeSize),
                    color = colors.faint,
                    maxLines = 1,
                    overflow = TextOverflow.Clip,
                )
            }
            AppText(
                text = item.body,
                style = AppTheme.typography.bodySmall.copy(
                    fontSize = NotificationsDesign.bodySize,
                    lineHeight = NotificationsDesign.bodyLineHeight,
                ),
                color = colors.muted,
                maxLines = NotificationsDesign.bodyLines,
                overflow = TextOverflow.Ellipsis,
                modifier = Modifier.padding(top = NotificationsDesign.bodyTop),
            )
        }
        if (unread) UnreadDot(modifier = Modifier.padding(top = NotificationsDesign.unreadDotTop))
    }
}

@Composable
internal fun relativeText(createdAt: String): String =
    when (val rel = relativeTimeOf(createdAt, BusinessTime.nowInstant(), BusinessTime.ZONE_ID)) {
        RelativeTime.Now -> stringResource(Res.string.time_now)
        is RelativeTime.Minutes -> pluralStringResource(Res.plurals.time_minutes_ago, rel.value, rel.value)
        is RelativeTime.Hours -> pluralStringResource(Res.plurals.time_hours_ago, rel.value, rel.value)
        RelativeTime.Yesterday -> stringResource(Res.string.time_yesterday)
        is RelativeTime.Days -> pluralStringResource(Res.plurals.time_days_ago, rel.value, rel.value)
        is RelativeTime.Date -> TimeFormat.isoDateText(rel.iso) ?: rel.iso
        null -> ""
    }
