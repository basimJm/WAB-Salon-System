package com.fab.wab.merchant.designsystem.components.booking

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.defaultMinSize
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.material3.Icon
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.text.font.FontWeight
import com.fab.wab.merchant.core.domain.booking.BookingStatus
import com.fab.wab.merchant.core.domain.booking.PaymentStatus
import com.fab.wab.merchant.core.domain.booking.RefundStatus
import com.fab.wab.merchant.designsystem.components.badge.AppStatusBadge
import com.fab.wab.merchant.designsystem.components.badge.StatusTone
import com.fab.wab.merchant.designsystem.components.text.AppText
import com.fab.wab.merchant.designsystem.icons.AppIcons
import com.fab.wab.merchant.designsystem.resources.Res
import com.fab.wab.merchant.designsystem.resources.booking_bride
import com.fab.wab.merchant.designsystem.resources.booking_status_approved
import com.fab.wab.merchant.designsystem.resources.booking_status_auto_cancelled
import com.fab.wab.merchant.designsystem.resources.booking_status_cancelled_by_customer
import com.fab.wab.merchant.designsystem.resources.booking_status_cancelled_by_salon
import com.fab.wab.merchant.designsystem.resources.booking_status_completed
import com.fab.wab.merchant.designsystem.resources.booking_status_no_show
import com.fab.wab.merchant.designsystem.resources.booking_status_pending
import com.fab.wab.merchant.designsystem.resources.booking_status_rejected
import com.fab.wab.merchant.designsystem.resources.payment_status_deposit_paid
import com.fab.wab.merchant.designsystem.resources.payment_status_fully_paid
import com.fab.wab.merchant.designsystem.resources.payment_status_paid
import com.fab.wab.merchant.designsystem.resources.payment_status_pay_on_arrival
import com.fab.wab.merchant.designsystem.resources.refund_status_failed
import com.fab.wab.merchant.designsystem.resources.refund_status_pending
import com.fab.wab.merchant.designsystem.resources.refund_status_refunded
import com.fab.wab.merchant.designsystem.theme.AppTheme
import org.jetbrains.compose.resources.StringResource
import org.jetbrains.compose.resources.stringResource

/** Badge hue per booking status (design `STC`: pending amber, approved green, completed violet, rejected/no-show rose). */
fun bookingStatusTone(status: BookingStatus): StatusTone = when (status) {
    BookingStatus.PENDING -> StatusTone.Warning
    BookingStatus.APPROVED -> StatusTone.Success
    BookingStatus.COMPLETED -> StatusTone.Accent
    BookingStatus.REJECTED, BookingStatus.NO_SHOW -> StatusTone.Danger
    BookingStatus.CANCELLED_BY_CUSTOMER, BookingStatus.CANCELLED_BY_SALON, BookingStatus.AUTO_CANCELLED -> StatusTone.Neutral
}

/** Refund hue (done green, failed rose, pending amber); null when there is no refund to show. */
fun refundTone(refund: RefundStatus): StatusTone? = when (refund) {
    RefundStatus.NONE -> null
    RefundStatus.REFUND_PENDING -> StatusTone.Warning
    RefundStatus.REFUNDED -> StatusTone.Success
    RefundStatus.REFUND_FAILED -> StatusTone.Danger
}

private val STATUS_TEXT: Map<BookingStatus, StringResource> = mapOf(
    BookingStatus.PENDING to Res.string.booking_status_pending,
    BookingStatus.APPROVED to Res.string.booking_status_approved,
    BookingStatus.REJECTED to Res.string.booking_status_rejected,
    BookingStatus.CANCELLED_BY_CUSTOMER to Res.string.booking_status_cancelled_by_customer,
    BookingStatus.CANCELLED_BY_SALON to Res.string.booking_status_cancelled_by_salon,
    BookingStatus.AUTO_CANCELLED to Res.string.booking_status_auto_cancelled,
    BookingStatus.COMPLETED to Res.string.booking_status_completed,
    BookingStatus.NO_SHOW to Res.string.booking_status_no_show,
)

private val PAYMENT_TEXT: Map<PaymentStatus, StringResource> = mapOf(
    PaymentStatus.PAY_ON_ARRIVAL to Res.string.payment_status_pay_on_arrival,
    PaymentStatus.DEPOSIT_PAID to Res.string.payment_status_deposit_paid,
    PaymentStatus.FULLY_PAID to Res.string.payment_status_fully_paid,
    PaymentStatus.PAID to Res.string.payment_status_paid,
)

private val REFUND_TEXT: Map<RefundStatus, StringResource> = mapOf(
    RefundStatus.REFUND_PENDING to Res.string.refund_status_pending,
    RefundStatus.REFUNDED to Res.string.refund_status_refunded,
    RefundStatus.REFUND_FAILED to Res.string.refund_status_failed,
)

/** Every status, payment and refund value that needs a label has one (checked by the unit test). */
internal val bookingBadgeTexts: Map<Enum<*>, StringResource> = STATUS_TEXT + PAYMENT_TEXT + REFUND_TEXT

@Composable
fun bookingStatusLabel(status: BookingStatus): String = stringResource(STATUS_TEXT.getValue(status))

@Composable
fun AppBookingStatusBadge(status: BookingStatus, modifier: Modifier = Modifier) {
    AppStatusBadge(text = bookingStatusLabel(status), tone = bookingStatusTone(status), modifier = modifier)
}

/** Payment badges are always violet in the design (`C.purple`). */
@Composable
fun AppPaymentBadge(payment: PaymentStatus, modifier: Modifier = Modifier) {
    AppStatusBadge(text = stringResource(PAYMENT_TEXT.getValue(payment)), tone = StatusTone.Accent, modifier = modifier)
}

/** Nothing is drawn for [RefundStatus.NONE]. */
@Composable
fun AppRefundBadge(refund: RefundStatus, modifier: Modifier = Modifier) {
    val tone = refundTone(refund) ?: return
    AppStatusBadge(text = stringResource(REFUND_TEXT.getValue(refund)), tone = tone, modifier = modifier)
}

/** The highly visible bride badge (crown on the rose gradient, Design Script §1.2). */
@Composable
fun AppBrideBadge(modifier: Modifier = Modifier) {
    val colors = AppTheme.colors
    val spacing = AppTheme.spacing
    Row(
        modifier = modifier
            .defaultMinSize(minHeight = AppTheme.sizes.brideBadgeHeight)
            .background(Brush.linearGradient(listOf(colors.brideStart, colors.brideEnd)), AppTheme.shapes.extraSmall)
            .padding(horizontal = spacing.space8, vertical = spacing.space2),
        horizontalArrangement = Arrangement.spacedBy(spacing.space4),
        verticalAlignment = Alignment.CenterVertically,
    ) {
        Icon(AppIcons.Crown, contentDescription = null, tint = colors.onGradient, modifier = Modifier.size(AppTheme.sizes.brideIcon))
        AppText(
            text = stringResource(Res.string.booking_bride),
            style = AppTheme.typography.labelSmall.copy(fontWeight = FontWeight.Bold),
            color = colors.onGradient,
            maxLines = 1,
        )
    }
}
