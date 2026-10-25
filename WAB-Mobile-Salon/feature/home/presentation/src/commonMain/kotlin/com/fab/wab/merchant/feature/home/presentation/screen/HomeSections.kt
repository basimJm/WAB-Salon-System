package com.fab.wab.merchant.feature.home.presentation.screen

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.IntrinsicSize
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxHeight
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.font.FontWeight
import com.fab.wab.merchant.designsystem.components.avatar.AppAvatar
import com.fab.wab.merchant.designsystem.components.badge.AppCountBadge
import com.fab.wab.merchant.designsystem.components.booking.AppBookingStatusBadge
import com.fab.wab.merchant.designsystem.components.booking.AppBrideBadge
import com.fab.wab.merchant.designsystem.components.button.AppIconButton
import com.fab.wab.merchant.designsystem.components.card.AppCard
import com.fab.wab.merchant.designsystem.components.dashboard.AppKpiTile
import com.fab.wab.merchant.designsystem.components.dashboard.AppNextBookingTile
import com.fab.wab.merchant.designsystem.components.dashboard.AppPendingRequestsCard
import com.fab.wab.merchant.designsystem.components.dashboard.AppStatTile
import com.fab.wab.merchant.designsystem.components.dashboard.KpiTone
import com.fab.wab.merchant.designsystem.components.dashboard.PendingRequestUi
import com.fab.wab.merchant.designsystem.components.feedback.AppEmptyState
import com.fab.wab.merchant.designsystem.components.format.dateTimeText
import com.fab.wab.merchant.designsystem.components.format.jodText
import com.fab.wab.merchant.designsystem.components.format.oneDecimalText
import com.fab.wab.merchant.designsystem.components.section.AppSectionHeader
import com.fab.wab.merchant.designsystem.components.text.AppText
import com.fab.wab.merchant.designsystem.icons.AppIcons
import com.fab.wab.merchant.designsystem.theme.AppTheme
import com.fab.wab.merchant.feature.home.domain.DashboardBooking
import com.fab.wab.merchant.feature.home.domain.DashboardSalon
import com.fab.wab.merchant.feature.home.domain.PendingRequests
import com.fab.wab.merchant.feature.home.domain.QuickStats
import com.fab.wab.merchant.feature.home.domain.TodayOverview
import com.fab.wab.merchant.feature.home.presentation.controller.contract.HomeContract.UiAction
import com.fab.wab.merchant.feature.home.presentation.resources.Res
import com.fab.wab.merchant.feature.home.presentation.resources.home_completed
import com.fab.wab.merchant.feature.home.presentation.resources.home_date_time
import com.fab.wab.merchant.feature.home.presentation.resources.home_hello
import com.fab.wab.merchant.feature.home.presentation.resources.home_list_separator
import com.fab.wab.merchant.feature.home.presentation.resources.home_my_timeline
import com.fab.wab.merchant.feature.home.presentation.resources.home_next
import com.fab.wab.merchant.feature.home.presentation.resources.home_next_none
import com.fab.wab.merchant.feature.home.presentation.resources.home_no_today
import com.fab.wab.merchant.feature.home.presentation.resources.home_no_today_body
import com.fab.wab.merchant.feature.home.presentation.resources.home_notifications
import com.fab.wab.merchant.feature.home.presentation.resources.home_open_calendar
import com.fab.wab.merchant.feature.home.presentation.resources.home_rating_value
import com.fab.wab.merchant.feature.home.presentation.resources.home_stat_bookings
import com.fab.wab.merchant.feature.home.presentation.resources.home_stat_rating
import com.fab.wab.merchant.feature.home.presentation.resources.home_stat_revenue
import com.fab.wab.merchant.feature.home.presentation.resources.home_time_range
import com.fab.wab.merchant.feature.home.presentation.resources.home_timeline
import com.fab.wab.merchant.feature.home.presentation.resources.home_today
import com.fab.wab.merchant.feature.home.presentation.resources.home_today_count
import com.fab.wab.merchant.feature.home.presentation.resources.home_view_all
import com.fab.wab.merchant.feature.home.presentation.resources.home_week
import org.jetbrains.compose.resources.stringResource

/** Salon photo + name, "Hello, {member}" (Start); bell with the unread badge 1–99 / "99+" (End). */
@Composable
internal fun HomeHeader(salon: DashboardSalon?, memberName: String, unread: Int, onAction: (UiAction) -> Unit) {
    val spacing = AppTheme.spacing
    Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(spacing.space12)) {
        AppAvatar(name = salon?.name.orEmpty(), imageUrl = salon?.imageUrl)
        Column(modifier = Modifier.weight(1f)) {
            AppText(
                text = salon?.name.orEmpty(),
                style = AppTheme.typography.titleMedium.copy(fontWeight = FontWeight.Bold),
                maxLines = 1,
            )
            if (memberName.isNotBlank()) {
                AppText(
                    text = stringResource(Res.string.home_hello, memberName),
                    style = AppTheme.typography.bodySmall,
                    color = AppTheme.colors.muted,
                    maxLines = 1,
                )
            }
        }
        Box {
            AppIconButton(AppIcons.Notifications, stringResource(Res.string.home_notifications), { onAction(UiAction.OnNotifications) })
            AppCountBadge(unread, Modifier.align(Alignment.TopEnd))
        }
    }
}

@Composable
private fun whenText(iso: String): String {
    val instant = instantOf(iso) ?: return iso
    val text = dateTimeText(instant)
    return stringResource(Res.string.home_date_time, text.date, text.time)
}

@Composable
private fun timeOf(iso: String): String = instantOf(iso)?.let { dateTimeText(it).time } ?: iso

@Composable
internal fun PendingSection(pending: PendingRequests, nowMs: Long, onAction: (UiAction) -> Unit) {
    val requests = pending.items.map { booking ->
        PendingRequestUi(
            id = booking.id,
            customerName = booking.customerName,
            persons = booking.persons,
            whenText = whenText(booking.start),
            age = booking.ageAt(nowMs),
            isBride = booking.hasBride,
            autoCancelIn = booking.autoCancelAt(nowMs),
        )
    }
    AppPendingRequestsCard(
        count = pending.count,
        requests = requests,
        onViewAll = { onAction(UiAction.OnViewAllRequests) },
        onRequestClick = { onAction(UiAction.OnBooking(it)) },
    )
}

@Composable
internal fun TodaySection(today: TodayOverview) {
    val spacing = AppTheme.spacing
    val separator = stringResource(Res.string.home_list_separator)
    Column(verticalArrangement = Arrangement.spacedBy(spacing.space10)) {
        AppSectionHeader(title = stringResource(Res.string.home_today))
        Row(Modifier.fillMaxWidth().height(IntrinsicSize.Min), horizontalArrangement = Arrangement.spacedBy(spacing.space10)) {
            val tile = Modifier.weight(1f).fillMaxHeight()
            AppKpiTile(today.approved.toString(), stringResource(Res.string.home_today_count), tile)
            AppKpiTile(today.completed.toString(), stringResource(Res.string.home_completed), tile, tone = KpiTone.Success)
            val next = today.next
            AppNextBookingTile(
                caption = stringResource(Res.string.home_next),
                time = next?.let { timeOf(it.start) } ?: stringResource(Res.string.home_next_none),
                subtitle = next?.let { listOf(it.customerName, it.staffLine(separator)).filter(String::isNotBlank).joinToString(separator) }
                    .orEmpty(),
                modifier = tile,
            )
        }
    }
}

@Composable
internal fun TimelineTitle(ownBookingsOnly: Boolean) {
    AppSectionHeader(title = stringResource(if (ownBookingsOnly) Res.string.home_my_timeline else Res.string.home_timeline))
}

@Composable
internal fun NoBookingsToday(onAction: (UiAction) -> Unit) {
    AppEmptyState(
        title = stringResource(Res.string.home_no_today),
        message = stringResource(Res.string.home_no_today_body),
        actionText = stringResource(Res.string.home_open_calendar),
        onAction = { onAction(UiAction.OnCalendar) },
    )
}

@Composable
internal fun TimelineRow(booking: DashboardBooking, onAction: (UiAction) -> Unit) {
    val spacing = AppTheme.spacing
    val separator = stringResource(Res.string.home_list_separator)
    AppCard(modifier = Modifier.fillMaxWidth(), onClick = { onAction(UiAction.OnBooking(booking.id)) }, contentPadding = spacing.space12) {
        Row(horizontalArrangement = Arrangement.spacedBy(spacing.space12), verticalAlignment = Alignment.CenterVertically) {
            Column(modifier = Modifier.weight(1f), verticalArrangement = Arrangement.spacedBy(spacing.space2)) {
                AppText(
                    text = stringResource(Res.string.home_time_range, timeOf(booking.start), timeOf(booking.end)),
                    style = AppTheme.typography.labelLarge.copy(fontWeight = FontWeight.Bold),
                    color = AppTheme.colors.accent,
                )
                Row(horizontalArrangement = Arrangement.spacedBy(spacing.space6), verticalAlignment = Alignment.CenterVertically) {
                    AppText(
                        text = booking.customerName,
                        style = AppTheme.typography.titleSmall.copy(fontWeight = FontWeight.Bold),
                        maxLines = 1,
                        modifier = Modifier.weight(1f, fill = false),
                    )
                    if (booking.hasBride) AppBrideBadge()
                }
                val staff = booking.staffLine(separator)
                if (staff.isNotBlank()) {
                    AppText(text = staff, style = AppTheme.typography.bodySmall, color = AppTheme.colors.muted, maxLines = 1)
                }
            }
            booking.status?.let { AppBookingStatusBadge(it) }
        }
    }
}

@Composable
internal fun QuickStatsSection(stats: QuickStats, onAction: (UiAction) -> Unit) {
    val spacing = AppTheme.spacing
    Column(verticalArrangement = Arrangement.spacedBy(spacing.space10)) {
        AppSectionHeader(
            title = stringResource(Res.string.home_week),
            actionText = stringResource(Res.string.home_view_all),
            onAction = { onAction(UiAction.OnStatistics) },
        )
        Row(Modifier.fillMaxWidth().height(IntrinsicSize.Min), horizontalArrangement = Arrangement.spacedBy(spacing.space10)) {
            val tile = Modifier.weight(1f).fillMaxHeight()
            AppStatTile(stringResource(Res.string.home_stat_bookings), stats.bookings.toString(), tile)
            AppStatTile(stringResource(Res.string.home_stat_revenue), jodText(stats.revenue), tile)
            AppStatTile(stringResource(Res.string.home_stat_rating), stringResource(Res.string.home_rating_value, oneDecimalText(stats.rating)), tile)
        }
    }
}
