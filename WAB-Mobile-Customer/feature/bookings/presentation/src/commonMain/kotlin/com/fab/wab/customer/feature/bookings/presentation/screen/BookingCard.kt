package com.fab.wab.customer.feature.bookings.presentation.screen

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import com.fab.wab.customer.core.common.TimeFormat
import com.fab.wab.customer.core.domain.booking.BookingStatus
import com.fab.wab.customer.core.domain.booking.BookingSummary
import com.fab.wab.customer.core.domain.booking.PaymentStatus
import com.fab.wab.customer.designsystem.components.badge.AppStatusBadge
import com.fab.wab.customer.designsystem.components.badge.StatusTone
import com.fab.wab.customer.designsystem.components.card.AppCard
import com.fab.wab.customer.designsystem.components.text.AppText
import com.fab.wab.customer.designsystem.resources.Res as CoreRes
import com.fab.wab.customer.designsystem.resources.time_am
import com.fab.wab.customer.designsystem.resources.time_pm
import com.fab.wab.customer.designsystem.theme.AppTheme
import com.fab.wab.customer.feature.bookings.presentation.resources.Res
import com.fab.wab.customer.feature.bookings.presentation.resources.booking_reference
import com.fab.wab.customer.feature.bookings.presentation.resources.booking_status_approved
import com.fab.wab.customer.feature.bookings.presentation.resources.booking_status_auto_cancelled
import com.fab.wab.customer.feature.bookings.presentation.resources.booking_status_cancelled_customer
import com.fab.wab.customer.feature.bookings.presentation.resources.booking_status_cancelled_salon
import com.fab.wab.customer.feature.bookings.presentation.resources.booking_status_completed
import com.fab.wab.customer.feature.bookings.presentation.resources.booking_status_no_show
import com.fab.wab.customer.feature.bookings.presentation.resources.booking_status_pending
import com.fab.wab.customer.feature.bookings.presentation.resources.booking_status_rejected
import com.fab.wab.customer.feature.bookings.presentation.resources.booking_status_unknown
import com.fab.wab.customer.feature.bookings.presentation.resources.payment_status_deposit_paid
import com.fab.wab.customer.feature.bookings.presentation.resources.payment_status_fully_paid
import com.fab.wab.customer.feature.bookings.presentation.resources.payment_status_paid
import com.fab.wab.customer.feature.bookings.presentation.resources.payment_status_pay_on_arrival
import com.fab.wab.customer.feature.bookings.presentation.resources.payment_status_unknown
import org.jetbrains.compose.resources.StringResource
import org.jetbrains.compose.resources.stringResource

/** PRD S14 card: salon name, reference number, date, time, booking status, payment status. */
@Composable
fun BookingCard(booking: BookingSummary, onClick: () -> Unit, modifier: Modifier = Modifier) {
    val spacing = AppTheme.spacing
    val start = TimeFormat.instantText(booking.appointmentStart, stringResource(CoreRes.string.time_am), stringResource(CoreRes.string.time_pm))
    AppCard(modifier = modifier.fillMaxWidth(), onClick = onClick) {
        Column(verticalArrangement = Arrangement.spacedBy(spacing.space8)) {
            AppText(text = booking.salonName.orEmpty(), style = AppTheme.typography.titleMedium, maxLines = 1)
            AppText(
                text = stringResource(Res.string.booking_reference, booking.referenceNumber),
                color = AppTheme.colors.muted,
                style = AppTheme.typography.bodySmall,
            )
            Row(horizontalArrangement = Arrangement.spacedBy(spacing.space12), verticalAlignment = Alignment.CenterVertically) {
                AppText(text = start?.date ?: booking.appointmentStart, color = AppTheme.colors.muted)
                AppText(text = start?.time.orEmpty(), color = AppTheme.colors.muted)
            }
            Row(horizontalArrangement = Arrangement.spacedBy(spacing.space8)) {
                val (statusRes, tone) = booking.status.label()
                AppStatusBadge(text = stringResource(statusRes), tone = tone)
                AppStatusBadge(text = stringResource(booking.paymentStatus.label()), tone = StatusTone.Neutral)
            }
        }
    }
}

/** Status → label + tone; pure so the mapping is unit-tested. */
fun BookingStatus.label(): Pair<StringResource, StatusTone> = when (this) {
    BookingStatus.PENDING -> Res.string.booking_status_pending to StatusTone.Warning
    BookingStatus.APPROVED -> Res.string.booking_status_approved to StatusTone.Success
    BookingStatus.REJECTED -> Res.string.booking_status_rejected to StatusTone.Danger
    BookingStatus.CANCELLED_BY_CUSTOMER -> Res.string.booking_status_cancelled_customer to StatusTone.Neutral
    BookingStatus.CANCELLED_BY_SALON -> Res.string.booking_status_cancelled_salon to StatusTone.Danger
    BookingStatus.AUTO_CANCELLED -> Res.string.booking_status_auto_cancelled to StatusTone.Danger
    BookingStatus.COMPLETED -> Res.string.booking_status_completed to StatusTone.Accent
    BookingStatus.NO_SHOW -> Res.string.booking_status_no_show to StatusTone.Danger
    BookingStatus.UNKNOWN -> Res.string.booking_status_unknown to StatusTone.Neutral
}

fun PaymentStatus.label(): StringResource = when (this) {
    PaymentStatus.PAY_ON_ARRIVAL -> Res.string.payment_status_pay_on_arrival
    PaymentStatus.DEPOSIT_PAID -> Res.string.payment_status_deposit_paid
    PaymentStatus.FULLY_PAID -> Res.string.payment_status_fully_paid
    PaymentStatus.PAID -> Res.string.payment_status_paid
    PaymentStatus.UNKNOWN -> Res.string.payment_status_unknown
}
