package com.fab.wab.customer.feature.notifications.presentation.screen

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextOverflow
import com.fab.wab.customer.core.common.BusinessTime
import com.fab.wab.customer.core.common.TimeFormat
import com.fab.wab.customer.designsystem.components.badge.AppStatusBadge
import com.fab.wab.customer.designsystem.components.badge.StatusTone
import com.fab.wab.customer.designsystem.components.card.AppCard
import com.fab.wab.customer.designsystem.components.text.AppText
import com.fab.wab.customer.designsystem.theme.AppTheme
import com.fab.wab.customer.feature.notifications.domain.model.Notification
import com.fab.wab.customer.feature.notifications.domain.model.RelativeTime
import com.fab.wab.customer.feature.notifications.domain.model.relativeTimeOf
import com.fab.wab.customer.feature.notifications.presentation.resources.Res
import com.fab.wab.customer.feature.notifications.presentation.resources.notifications_unread
import com.fab.wab.customer.feature.notifications.presentation.resources.time_days_ago
import com.fab.wab.customer.feature.notifications.presentation.resources.time_hours_ago
import com.fab.wab.customer.feature.notifications.presentation.resources.time_minutes_ago
import com.fab.wab.customer.feature.notifications.presentation.resources.time_now
import com.fab.wab.customer.feature.notifications.presentation.resources.time_yesterday
import kotlinx.datetime.Clock
import org.jetbrains.compose.resources.stringResource

private const val BODY_PREVIEW_LINES = 2

/** S19 list item: title, short body, relative time; unread = bold title + badge. */
@Composable
internal fun NotificationRow(item: Notification, onClick: () -> Unit, modifier: Modifier = Modifier) {
    val spacing = AppTheme.spacing
    AppCard(modifier = modifier.fillMaxWidth(), onClick = onClick) {
        Column(verticalArrangement = Arrangement.spacedBy(spacing.space4)) {
            Row(modifier = Modifier.fillMaxWidth(), verticalAlignment = Alignment.CenterVertically) {
                AppText(
                    text = item.title,
                    style = AppTheme.typography.titleSmall.copy(fontWeight = if (item.isRead) FontWeight.Normal else FontWeight.Bold),
                    modifier = Modifier.weight(1f),
                    maxLines = 1,
                    overflow = TextOverflow.Ellipsis,
                )
                if (!item.isRead) AppStatusBadge(text = stringResource(Res.string.notifications_unread), tone = StatusTone.Accent)
            }
            AppText(
                text = item.body,
                style = AppTheme.typography.bodyMedium,
                color = AppTheme.colors.muted,
                maxLines = BODY_PREVIEW_LINES,
                overflow = TextOverflow.Ellipsis,
            )
            AppText(text = relativeText(item.createdAt), style = AppTheme.typography.labelSmall, color = AppTheme.colors.muted)
        }
    }
}

@Composable
internal fun relativeText(createdAt: String): String =
    when (val rel = relativeTimeOf(createdAt, Clock.System.now(), BusinessTime.ZONE_ID)) {
        RelativeTime.Now -> stringResource(Res.string.time_now)
        is RelativeTime.Minutes -> stringResource(Res.string.time_minutes_ago, rel.value)
        is RelativeTime.Hours -> stringResource(Res.string.time_hours_ago, rel.value)
        RelativeTime.Yesterday -> stringResource(Res.string.time_yesterday)
        is RelativeTime.Days -> stringResource(Res.string.time_days_ago, rel.value)
        is RelativeTime.Date -> TimeFormat.isoDateText(rel.iso) ?: rel.iso
        null -> ""
    }
