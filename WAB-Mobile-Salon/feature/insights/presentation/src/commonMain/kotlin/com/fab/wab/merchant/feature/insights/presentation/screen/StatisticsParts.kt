package com.fab.wab.merchant.feature.insights.presentation.screen

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.IntrinsicSize
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxHeight
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.font.FontWeight
import com.fab.wab.merchant.core.domain.booking.BookingStatus
import com.fab.wab.merchant.designsystem.components.booking.AppBookingStatusBadge
import com.fab.wab.merchant.designsystem.components.card.AppCard
import com.fab.wab.merchant.designsystem.components.dashboard.AppStatTile
import com.fab.wab.merchant.designsystem.components.format.jodText
import com.fab.wab.merchant.designsystem.components.format.oneDecimalText
import com.fab.wab.merchant.designsystem.components.section.AppSectionHeader
import com.fab.wab.merchant.designsystem.components.text.AppText
import com.fab.wab.merchant.designsystem.theme.AppTheme
import com.fab.wab.merchant.feature.insights.domain.Revenue
import com.fab.wab.merchant.feature.insights.domain.Statistics
import com.fab.wab.merchant.feature.insights.presentation.resources.Res
import com.fab.wab.merchant.feature.insights.presentation.resources.stats_at_salon
import com.fab.wab.merchant.feature.insights.presentation.resources.stats_bookings_count
import com.fab.wab.merchant.feature.insights.presentation.resources.stats_by_status
import com.fab.wab.merchant.feature.insights.presentation.resources.stats_kpi_approval
import com.fab.wab.merchant.feature.insights.presentation.resources.stats_kpi_bookings
import com.fab.wab.merchant.feature.insights.presentation.resources.stats_kpi_bride
import com.fab.wab.merchant.feature.insights.presentation.resources.stats_kpi_cancellation
import com.fab.wab.merchant.feature.insights.presentation.resources.stats_kpi_no_show
import com.fab.wab.merchant.feature.insights.presentation.resources.stats_kpi_rating
import com.fab.wab.merchant.feature.insights.presentation.resources.stats_kpi_response
import com.fab.wab.merchant.feature.insights.presentation.resources.stats_kpi_reviews
import com.fab.wab.merchant.feature.insights.presentation.resources.stats_kpi_views
import com.fab.wab.merchant.feature.insights.presentation.resources.stats_none
import com.fab.wab.merchant.feature.insights.presentation.resources.stats_online
import com.fab.wab.merchant.feature.insights.presentation.resources.stats_percent
import com.fab.wab.merchant.feature.insights.presentation.resources.stats_rating_value
import com.fab.wab.merchant.feature.insights.presentation.resources.stats_revenue
import com.fab.wab.merchant.feature.insights.presentation.resources.stats_top_services
import com.fab.wab.merchant.feature.insights.presentation.resources.stats_top_staff
import org.jetbrains.compose.resources.StringResource
import org.jetbrains.compose.resources.pluralStringResource
import org.jetbrains.compose.resources.stringResource

/** "94.7%" or "—" when the server had nothing to measure. */
@Composable
private fun percentText(rate: Double?): String =
    rate?.let { stringResource(Res.string.stats_percent, oneDecimalText(it)) } ?: stringResource(Res.string.stats_none)

/** PRD M21 KPI list, three tiles per row. */
@Composable
internal fun KpiGrid(stats: Statistics) {
    val bookings = stats.bookings
    val tiles: List<Pair<StringResource, String>> = listOf(
        Res.string.stats_kpi_bookings to bookings.total.toString(),
        Res.string.stats_kpi_approval to percentText(bookings.approvalRate),
        Res.string.stats_kpi_cancellation to percentText(bookings.cancellationRate),
        Res.string.stats_kpi_no_show to percentText(bookings.noShowRate),
        Res.string.stats_kpi_response to (bookings.averageResponseMinutes?.let(::oneDecimalText) ?: stringResource(Res.string.stats_none)),
        Res.string.stats_kpi_bride to bookings.brideBookings.toString(),
        Res.string.stats_kpi_views to stats.profileViews.toString(),
        Res.string.stats_kpi_reviews to stats.newReviews.toString(),
        Res.string.stats_kpi_rating to oneDecimalText(stats.averageRating),
    )
    val spacing = AppTheme.spacing
    Column(verticalArrangement = Arrangement.spacedBy(spacing.space10)) {
        tiles.chunked(InsightsDesignConstants.KPI_COLUMNS).forEach { row ->
            Row(Modifier.fillMaxWidth().height(IntrinsicSize.Min), horizontalArrangement = Arrangement.spacedBy(spacing.space10)) {
                row.forEach { (label, value) -> AppStatTile(stringResource(label), value, Modifier.weight(1f).fillMaxHeight()) }
                repeat(InsightsDesignConstants.KPI_COLUMNS - row.size) { Spacer(Modifier.weight(1f)) }
            }
        }
    }
}

/** Revenue = online collected + marked paid at the salon (JOD, tax inclusive). */
@Composable
internal fun RevenueCard(revenue: Revenue) {
    val spacing = AppTheme.spacing
    AppCard(modifier = Modifier.fillMaxWidth()) {
        Column(verticalArrangement = Arrangement.spacedBy(spacing.space6)) {
            AppText(text = stringResource(Res.string.stats_revenue), style = AppTheme.typography.labelLarge, color = AppTheme.colors.muted)
            AppText(text = jodText(revenue.total), style = AppTheme.typography.headlineMedium.copy(fontWeight = FontWeight.Bold))
            LabelValue(stringResource(Res.string.stats_online), jodText(revenue.online))
            LabelValue(stringResource(Res.string.stats_at_salon), jodText(revenue.atSalon))
        }
    }
}

@Composable
private fun LabelValue(label: String, value: String) {
    Row(Modifier.fillMaxWidth(), verticalAlignment = Alignment.CenterVertically) {
        AppText(text = label, style = AppTheme.typography.bodySmall, color = AppTheme.colors.muted, modifier = Modifier.weight(1f))
        AppText(text = value, style = AppTheme.typography.bodyMedium.copy(fontWeight = FontWeight.Bold))
    }
}

/** Bookings by status (PRD M21 "bookings (by status)"); statuses with no booking are left out. */
@Composable
internal fun StatusCard(byStatus: Map<BookingStatus, Int>) {
    val rows = BookingStatus.entries.mapNotNull { status -> byStatus[status]?.takeIf { it > 0 }?.let { status to it } }
    if (rows.isEmpty()) return
    val spacing = AppTheme.spacing
    AppCard(modifier = Modifier.fillMaxWidth()) {
        Column(verticalArrangement = Arrangement.spacedBy(spacing.space8)) {
            AppText(
                text = stringResource(Res.string.stats_by_status),
                style = AppTheme.typography.labelLarge,
                color = AppTheme.colors.muted,
            )
            rows.forEach { (status, count) ->
                Row(Modifier.fillMaxWidth(), verticalAlignment = Alignment.CenterVertically) {
                    AppBookingStatusBadge(status)
                    Spacer(Modifier.weight(1f))
                    AppText(text = count.toString(), style = AppTheme.typography.titleSmall.copy(fontWeight = FontWeight.Bold))
                }
            }
        }
    }
}

/** Top services (bookings) and top staff (bookings, rating). */
@Composable
internal fun Rankings(stats: Statistics) {
    val spacing = AppTheme.spacing
    Column(verticalArrangement = Arrangement.spacedBy(spacing.space10)) {
        if (stats.topServices.isNotEmpty()) {
            AppSectionHeader(title = stringResource(Res.string.stats_top_services))
            stats.topServices.forEachIndexed { index, service ->
                RankRow(index + 1, service.name, pluralStringResource(Res.plurals.stats_bookings_count, service.bookings, service.bookings))
            }
        }
        if (stats.topStaff.isNotEmpty()) {
            AppSectionHeader(title = stringResource(Res.string.stats_top_staff))
            stats.topStaff.forEachIndexed { index, staff ->
                val bookings = pluralStringResource(Res.plurals.stats_bookings_count, staff.bookings, staff.bookings)
                RankRow(index + 1, staff.firstName, bookings, rating = oneDecimalText(staff.rating))
            }
        }
    }
}

@Composable
private fun RankRow(rank: Int, name: String, detail: String, rating: String? = null) {
    val spacing = AppTheme.spacing
    AppCard(modifier = Modifier.fillMaxWidth(), contentPadding = spacing.space12) {
        Row(horizontalArrangement = Arrangement.spacedBy(spacing.space12), verticalAlignment = Alignment.CenterVertically) {
            AppText(
                text = rank.toString(),
                style = AppTheme.typography.titleMedium.copy(fontWeight = FontWeight.Bold),
                color = AppTheme.colors.accent,
            )
            Column(modifier = Modifier.weight(1f)) {
                AppText(text = name, style = AppTheme.typography.titleSmall.copy(fontWeight = FontWeight.Bold), maxLines = 1)
                AppText(text = detail, style = AppTheme.typography.bodySmall, color = AppTheme.colors.muted)
            }
            rating?.let { RatingValue(it) }
        }
    }
}

@Composable
private fun RatingValue(rating: String) {
    AppText(
        text = stringResource(Res.string.stats_rating_value, rating),
        style = AppTheme.typography.labelMedium,
        color = AppTheme.colors.muted,
    )
}
