package com.fab.wab.customer.feature.bookings.presentation.screen

import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.rounded.Schedule
import androidx.compose.material3.Icon
import androidx.compose.runtime.Composable
import androidx.compose.runtime.remember
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.semantics.Role
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.text.style.TextDirection
import com.fab.wab.customer.core.common.TimeFormat
import com.fab.wab.customer.core.domain.booking.BookingStatus
import com.fab.wab.customer.core.domain.booking.BookingSummary
import com.fab.wab.customer.core.domain.booking.PaymentStatus
import com.fab.wab.customer.designsystem.components.badge.AppStatusBadge
import com.fab.wab.customer.designsystem.components.badge.StatusTone
import com.fab.wab.customer.designsystem.components.glass.glassBackground
import com.fab.wab.customer.designsystem.components.text.AppText
import com.fab.wab.customer.designsystem.icons.AppIcons
import com.fab.wab.customer.designsystem.resources.Res as CoreRes
import com.fab.wab.customer.designsystem.resources.time_am
import com.fab.wab.customer.designsystem.resources.time_pm
import com.fab.wab.customer.designsystem.theme.AppTheme
import com.fab.wab.customer.feature.bookings.presentation.resources.Res
import com.fab.wab.customer.feature.bookings.presentation.resources.booking_status_approved
import com.fab.wab.customer.feature.bookings.presentation.resources.booking_status_auto_cancelled
import com.fab.wab.customer.feature.bookings.presentation.resources.booking_status_cancelled_customer
import com.fab.wab.customer.feature.bookings.presentation.resources.booking_status_cancelled_salon
import com.fab.wab.customer.feature.bookings.presentation.resources.booking_status_completed
import com.fab.wab.customer.feature.bookings.presentation.resources.booking_status_no_show
import com.fab.wab.customer.feature.bookings.presentation.resources.booking_status_pending
import com.fab.wab.customer.feature.bookings.presentation.resources.booking_status_rejected
import com.fab.wab.customer.feature.bookings.presentation.resources.booking_status_unknown
import com.fab.wab.customer.feature.bookings.presentation.resources.card_rejection_reason
import com.fab.wab.customer.feature.bookings.presentation.resources.payment_status_deposit_paid
import com.fab.wab.customer.feature.bookings.presentation.resources.payment_status_fully_paid
import com.fab.wab.customer.feature.bookings.presentation.resources.payment_status_paid
import com.fab.wab.customer.feature.bookings.presentation.resources.payment_status_pay_on_arrival
import com.fab.wab.customer.feature.bookings.presentation.resources.payment_status_unknown
import org.jetbrains.compose.resources.StringResource
import org.jetbrains.compose.resources.stringResource

/**
 * Design S14 card: `padding:14px;border-radius:18px;border:1px solid var(--line);background:var(--card);
 * box-shadow:0 4px 14px rgba(31,34,51,.04)`; 52 px salon thumb, bold 14.5 px name, `#ref` (LTR, faint 12 px), chevron;
 * calendar + clock row (12.5 px muted); status + payment badges.
 */
@Composable
fun BookingCard(booking: BookingSummary, onClick: () -> Unit, modifier: Modifier = Modifier) {
    val colors = AppTheme.colors
    val spacing = AppTheme.spacing
    val shape = bookingCardShape
    val am = stringResource(CoreRes.string.time_am)
    val pm = stringResource(CoreRes.string.time_pm)
    // CUS-097: parse + zone conversion once per booking, not on every recomposition of a visible card.
    val start = remember(booking.appointmentStart, am, pm) { TimeFormat.instantText(booking.appointmentStart, am, pm) }
    val salonName = booking.salonName.orEmpty()
    Column(
        modifier = modifier
            .fillMaxWidth()
            .clip(shape)
            .glassBackground(AppTheme.glass, shape)
            .clickable(role = Role.Button, onClick = onClick)
            .padding(spacing.space14),
    ) {
        Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(spacing.space12)) {
            SalonThumb(name = salonName, imageUrl = null)
            Column(modifier = Modifier.weight(1f)) {
                AppText(
                    text = salonName,
                    style = AppTheme.typography.titleSmall.copy(fontSize = BookingsDesign.fontTitle, fontWeight = FontWeight.Bold),
                    maxLines = 1,
                )
                BookedBranchLines(booking.branch, withAddress = false)
                AppText(
                    text = BookingsDesign.REFERENCE_PREFIX + booking.referenceNumber,
                    style = AppTheme.typography.bodySmall.copy(textDirection = TextDirection.Ltr),
                    color = colors.faint,
                    textAlign = TextAlign.Start,
                    maxLines = 1,
                )
            }
            Icon(AppIcons.Forward, contentDescription = null, tint = colors.faint, modifier = Modifier.size(AppTheme.sizes.iconSmall))
        }
        Row(
            modifier = Modifier.padding(top = spacing.space12, bottom = spacing.space10),
            horizontalArrangement = Arrangement.spacedBy(spacing.space14),
            verticalAlignment = Alignment.CenterVertically,
        ) {
            IconLine(AppIcons.Bookings, start?.date ?: booking.appointmentStart)
            IconLine(Icons.Rounded.Schedule, start?.time.orEmpty())
        }
        Row(horizontalArrangement = Arrangement.spacedBy(spacing.space6)) {
            val (statusRes, tone) = booking.status.label()
            AppStatusBadge(text = stringResource(statusRes), tone = tone)
            AppStatusBadge(text = stringResource(booking.paymentStatus.label()), tone = StatusTone.Accent)
        }
        cardRejectionOf(booking)?.let { reason ->
            AppText(
                text = stringResource(Res.string.card_rejection_reason, reasonText(reason)),
                style = AppTheme.typography.bodySmall.copy(fontSize = BookingsDesign.fontCaption),
                color = colors.danger,
                maxLines = BookingsDesign.CARD_REASON_MAX_LINES,
                modifier = Modifier.padding(top = spacing.space8),
            )
        }
    }
}

@Composable
private fun IconLine(icon: ImageVector, text: String) {
    Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(AppTheme.spacing.space6)) {
        Icon(icon, contentDescription = null, tint = AppTheme.colors.muted, modifier = Modifier.size(BookingsDesign.cardIcon))
        AppText(
            text = text,
            style = AppTheme.typography.bodySmall.copy(fontSize = BookingsDesign.fontCaption),
            color = AppTheme.colors.muted,
            maxLines = 1,
        )
    }
}

/** Status → label + tone (design `STC`: pending amber, approved green, rejected/no-show rose, cancellations grey, completed purple). */
fun BookingStatus.label(): Pair<StringResource, StatusTone> = when (this) {
    BookingStatus.PENDING -> Res.string.booking_status_pending to StatusTone.Warning
    BookingStatus.APPROVED -> Res.string.booking_status_approved to StatusTone.Success
    BookingStatus.REJECTED -> Res.string.booking_status_rejected to StatusTone.Danger
    BookingStatus.CANCELLED_BY_CUSTOMER -> Res.string.booking_status_cancelled_customer to StatusTone.Neutral
    BookingStatus.CANCELLED_BY_SALON -> Res.string.booking_status_cancelled_salon to StatusTone.Neutral
    BookingStatus.AUTO_CANCELLED -> Res.string.booking_status_auto_cancelled to StatusTone.Neutral
    BookingStatus.COMPLETED -> Res.string.booking_status_completed to StatusTone.Accent
    BookingStatus.NO_SHOW -> Res.string.booking_status_no_show to StatusTone.Danger
    BookingStatus.UNKNOWN -> Res.string.booking_status_unknown to StatusTone.Neutral
}

/** Payment badge text (design `t.py`); the badge is always purple (`C.purple`). */
fun PaymentStatus.label(): StringResource = when (this) {
    PaymentStatus.PAY_ON_ARRIVAL -> Res.string.payment_status_pay_on_arrival
    PaymentStatus.DEPOSIT_PAID -> Res.string.payment_status_deposit_paid
    PaymentStatus.FULLY_PAID -> Res.string.payment_status_fully_paid
    PaymentStatus.PAID -> Res.string.payment_status_paid
    PaymentStatus.UNKNOWN -> Res.string.payment_status_unknown
}
