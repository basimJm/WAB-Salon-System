package com.fab.wab.merchant.designsystem.components.booking

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.ExperimentalLayoutApi
import androidx.compose.foundation.layout.FlowRow
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.material3.Icon
import androidx.compose.runtime.Composable
import androidx.compose.runtime.CompositionLocalProvider
import androidx.compose.runtime.Immutable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.platform.LocalLayoutDirection
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.LayoutDirection
import com.fab.wab.merchant.core.domain.booking.BookingStatus
import com.fab.wab.merchant.core.domain.booking.PaymentStatus
import com.fab.wab.merchant.core.domain.booking.RefundStatus
import com.fab.wab.merchant.designsystem.components.card.AppCard
import com.fab.wab.merchant.designsystem.components.format.metaPair
import com.fab.wab.merchant.designsystem.components.text.AppText
import com.fab.wab.merchant.designsystem.icons.AppIcons
import com.fab.wab.merchant.designsystem.resources.Res
import com.fab.wab.merchant.designsystem.resources.booking_persons
import com.fab.wab.merchant.designsystem.resources.booking_reference
import com.fab.wab.merchant.designsystem.theme.AppTheme
import org.jetbrains.compose.resources.pluralStringResource
import org.jetbrains.compose.resources.stringResource
import kotlin.time.Duration

/**
 * One booking in the merchant lists (Design Script §1.2, design 03 Bookings). Texts that depend on the feature's
 * formatting (date, time, staff names) arrive pre-localized; [pendingAge] and [autoCancelIn] come from
 * `BookingTimers` with the feature's ticking clock and only show while [status] is pending.
 */
@Immutable
data class BookingCardUi(
    val id: String,
    val reference: String,
    val customerName: String,
    val date: String,
    val time: String,
    val persons: Int,
    val staff: String,
    val status: BookingStatus,
    val payment: PaymentStatus?,
    val refund: RefundStatus = RefundStatus.NONE,
    val isBride: Boolean = false,
    val pendingAge: Duration? = null,
    val autoCancelIn: Duration? = null,
    /** Branch name, shown when the owner sees several branches at once (MER-063). */
    val branch: String? = null,
) {
    val isPending: Boolean get() = status == BookingStatus.PENDING
    val showsAutoCancel: Boolean get() = isPending && autoCancelIn != null
}

@Composable
fun AppBookingCard(
    booking: BookingCardUi,
    onClick: () -> Unit,
    modifier: Modifier = Modifier,
) {
    val spacing = AppTheme.spacing
    AppCard(modifier = modifier.fillMaxWidth(), onClick = onClick, contentPadding = spacing.space14) {
        Column(verticalArrangement = Arrangement.spacedBy(spacing.space10)) {
            CardHeader(booking)
            BookingMeta(booking)
            BadgeLine(booking)
            val autoCancelIn = booking.autoCancelIn
            if (booking.showsAutoCancel && autoCancelIn != null) AutoCancelStrip(autoCancelText(autoCancelIn))
        }
    }
}

@OptIn(ExperimentalLayoutApi::class)
@Composable
private fun CardHeader(booking: BookingCardUi) {
    val spacing = AppTheme.spacing
    Row(horizontalArrangement = Arrangement.spacedBy(spacing.space10), verticalAlignment = Alignment.Top) {
        Column(modifier = Modifier.weight(1f)) {
            FlowRow(
                horizontalArrangement = Arrangement.spacedBy(spacing.space6),
                verticalArrangement = Arrangement.spacedBy(spacing.space4),
                itemVerticalAlignment = Alignment.CenterVertically,
            ) {
                AppText(
                    text = booking.customerName,
                    style = AppTheme.typography.titleSmall.copy(fontWeight = FontWeight.Bold),
                    maxLines = 1,
                )
                if (booking.isBride) AppBrideBadge()
            }
            // References are Latin codes: always read left to right, aligned to the start of the card.
            CompositionLocalProvider(LocalLayoutDirection provides LayoutDirection.Ltr) {
                AppText(
                    text = stringResource(Res.string.booking_reference, booking.reference),
                    style = AppTheme.typography.labelSmall,
                    color = AppTheme.colors.faint,
                    maxLines = 1,
                )
            }
        }
        AppBookingStatusBadge(booking.status)
    }
}

@OptIn(ExperimentalLayoutApi::class)
@Composable
private fun BookingMeta(booking: BookingCardUi) {
    val spacing = AppTheme.spacing
    FlowRow(
        horizontalArrangement = Arrangement.spacedBy(spacing.space14),
        verticalArrangement = Arrangement.spacedBy(spacing.space6),
    ) {
        MetaItem(AppIcons.Calendar, metaPair(booking.date, booking.time))
        MetaItem(AppIcons.Companions, pluralStringResource(Res.plurals.booking_persons, booking.persons, booking.persons))
        if (booking.staff.isNotBlank()) MetaItem(AppIcons.Person, booking.staff)
        booking.branch?.let { MetaItem(AppIcons.Store, it) }
    }
}

@Composable
internal fun MetaItem(icon: ImageVector, text: String, modifier: Modifier = Modifier) {
    val colors = AppTheme.colors
    Row(
        modifier = modifier,
        horizontalArrangement = Arrangement.spacedBy(AppTheme.spacing.space4),
        verticalAlignment = Alignment.CenterVertically,
    ) {
        Icon(icon, contentDescription = null, tint = colors.muted, modifier = Modifier.size(AppTheme.sizes.metaIcon))
        AppText(text = text, style = AppTheme.typography.bodySmall, color = colors.muted, maxLines = 1)
    }
}

@OptIn(ExperimentalLayoutApi::class)
@Composable
private fun BadgeLine(booking: BookingCardUi) {
    val spacing = AppTheme.spacing
    val payment = booking.payment
    val age = booking.pendingAge
    Row(
        modifier = Modifier.fillMaxWidth(),
        horizontalArrangement = Arrangement.spacedBy(spacing.space6),
        verticalAlignment = Alignment.CenterVertically,
    ) {
        FlowRow(
            modifier = Modifier.weight(1f),
            horizontalArrangement = Arrangement.spacedBy(spacing.space6),
            verticalArrangement = Arrangement.spacedBy(spacing.space4),
        ) {
            if (payment != null) AppPaymentBadge(payment)
            AppRefundBadge(booking.refund)
        }
        if (booking.isPending && age != null) {
            AppText(text = pendingAgeText(age), style = AppTheme.typography.labelSmall, color = AppTheme.colors.faint, maxLines = 1)
        }
    }
}

/** The rose "auto-cancels in …" line under a pending card (design `c.hasAuto`). */
@Composable
fun AutoCancelStrip(text: String, modifier: Modifier = Modifier) {
    val colors = AppTheme.colors
    val spacing = AppTheme.spacing
    Row(
        modifier = modifier
            .fillMaxWidth()
            .background(colors.dangerContainer, AppTheme.shapes.small)
            .padding(horizontal = spacing.space10, vertical = spacing.space6),
        horizontalArrangement = Arrangement.spacedBy(spacing.space6),
        verticalAlignment = Alignment.CenterVertically,
    ) {
        Icon(AppIcons.Clock, contentDescription = null, tint = colors.onDangerContainer, modifier = Modifier.size(AppTheme.sizes.metaIcon))
        AppText(
            text = text,
            style = AppTheme.typography.labelSmall.copy(fontWeight = FontWeight.SemiBold),
            color = colors.onDangerContainer,
        )
    }
}
