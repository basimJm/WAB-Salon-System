package com.fab.wab.customer.feature.bookings.presentation.screen

import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.widthIn
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.semantics.Role
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.Dp
import androidx.compose.ui.unit.TextUnit
import androidx.compose.ui.window.Dialog
import com.fab.wab.customer.core.domain.booking.BookingDetails
import com.fab.wab.customer.core.domain.booking.RefundStatus
import com.fab.wab.customer.designsystem.components.text.AppText
import com.fab.wab.customer.designsystem.resources.Res as CoreRes
import com.fab.wab.customer.designsystem.resources.price_jod
import com.fab.wab.customer.designsystem.theme.AppTheme
import com.fab.wab.customer.feature.bookings.domain.model.RefundOutcome
import com.fab.wab.customer.feature.bookings.presentation.resources.Res
import com.fab.wab.customer.feature.bookings.presentation.resources.details_cancel_body
import com.fab.wab.customer.feature.bookings.presentation.resources.details_cancel_confirm
import com.fab.wab.customer.feature.bookings.presentation.resources.details_cancel_dismiss
import com.fab.wab.customer.feature.bookings.presentation.resources.details_cancel_title
import com.fab.wab.customer.feature.bookings.presentation.resources.details_paid
import com.fab.wab.customer.feature.bookings.presentation.resources.details_payment
import com.fab.wab.customer.feature.bookings.presentation.resources.details_policy
import com.fab.wab.customer.feature.bookings.presentation.resources.details_policy_deposit
import com.fab.wab.customer.feature.bookings.presentation.resources.details_policy_deposit_non_refundable
import com.fab.wab.customer.feature.bookings.presentation.resources.details_policy_deposit_refundable
import com.fab.wab.customer.feature.bookings.presentation.resources.details_policy_window
import com.fab.wab.customer.feature.bookings.presentation.resources.details_refund_deposit_deducted
import com.fab.wab.customer.feature.bookings.presentation.resources.details_refund_deposit_kept
import com.fab.wab.customer.feature.bookings.presentation.resources.details_refund_full
import com.fab.wab.customer.feature.bookings.presentation.resources.details_refund_nothing
import com.fab.wab.customer.feature.bookings.presentation.resources.details_refunded
import com.fab.wab.customer.feature.bookings.presentation.resources.details_remaining
import com.fab.wab.customer.feature.bookings.presentation.resources.details_total
import org.jetbrains.compose.resources.StringResource
import org.jetbrains.compose.resources.stringResource

/**
 * Design payment card: `padding:14px 16px;border-radius:18px;background:var(--surface)`; 14.5 px bold title; 13 px rows
 * (muted label, 600 value); dashed separator then the 14 px bold "Remaining" row with the amount in accent.
 */
@Composable
internal fun PaymentBlock(booking: BookingDetails) {
    val colors = AppTheme.colors
    val spacing = AppTheme.spacing
    DesignCard(filled = true, contentPadding = spacing.space0) {
        Column(modifier = Modifier.padding(horizontal = spacing.space16, vertical = spacing.space14)) {
            BlockTitle(stringResource(Res.string.details_payment), bottom = spacing.space8)
            MoneyRow(Res.string.details_total, booking.money.total)
            MoneyRow(Res.string.details_paid, booking.money.paidOnline)
            if (booking.refundStatus == RefundStatus.REFUNDED) MoneyRow(Res.string.details_refunded, booking.money.refunded)
            Row(
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(top = spacing.space4)
                    .dashedTopBorder(colors.line, AppTheme.sizes.hairline)
                    .padding(top = spacing.space8),
                horizontalArrangement = Arrangement.SpaceBetween,
            ) {
                val bold = AppTheme.typography.bodyMedium.copy(fontWeight = FontWeight.Bold)
                AppText(text = stringResource(Res.string.details_remaining), style = bold, modifier = Modifier.weight(1f))
                AppText(text = stringResource(CoreRes.string.price_jod, booking.money.remaining), style = bold, color = colors.accent)
            }
        }
    }
}

@Composable
private fun MoneyRow(labelRes: StringResource, amount: String) {
    val style = AppTheme.typography.bodyMedium.copy(fontSize = BookingsDesign.fontBody)
    Row(modifier = Modifier.fillMaxWidth().padding(vertical = AppTheme.spacing.space4), horizontalArrangement = Arrangement.SpaceBetween) {
        AppText(text = stringResource(labelRes), style = style, color = AppTheme.colors.muted, modifier = Modifier.weight(1f))
        AppText(text = stringResource(CoreRes.string.price_jod, amount), style = style.copy(fontWeight = FontWeight.SemiBold))
    }
}

/** Design policy card: bordered 18 px card, 14.5 px bold title, accent "•" bullets with 12.5 px muted text (line-height 1.6). */
@Composable
internal fun PolicyBlock(booking: BookingDetails) {
    val policy = booking.policy ?: return
    val spacing = AppTheme.spacing
    val refundRes = if (policy.depositRefundableOnCustomerCancel) {
        Res.string.details_policy_deposit_refundable
    } else {
        Res.string.details_policy_deposit_non_refundable
    }
    val rules = listOfNotNull(
        stringResource(Res.string.details_policy_window, policy.cancellationWindowHours.toInt()),
        policy.depositPercentage?.let { stringResource(Res.string.details_policy_deposit, it.toInt()) },
        stringResource(refundRes),
        policy.notes,
    )
    DesignCard(contentPadding = spacing.space0) {
        Column(modifier = Modifier.padding(horizontal = spacing.space16, vertical = spacing.space14)) {
            BlockTitle(stringResource(Res.string.details_policy), bottom = spacing.space6)
            rules.forEach { PolicyRule(it) }
        }
    }
}

@Composable
private fun PolicyRule(text: String) {
    val style = AppTheme.typography.bodySmall.copy(fontSize = BookingsDesign.fontCaption, lineHeight = BookingsDesign.lineHeightBody)
    Row(horizontalArrangement = Arrangement.spacedBy(AppTheme.spacing.space8)) {
        AppText(text = BookingsDesign.BULLET, style = style, color = AppTheme.colors.accent)
        AppText(text = text, style = style, color = AppTheme.colors.muted)
    }
}

@Composable
private fun BlockTitle(text: String, bottom: Dp) {
    AppText(
        text = text,
        style = AppTheme.typography.titleSmall.copy(fontSize = BookingsDesign.fontTitle, fontWeight = FontWeight.Bold),
        modifier = Modifier.padding(bottom = bottom),
    )
}

/**
 * Design `dlg`: 24 px card, `padding:26px 22px 20px`, 56 px rose "!" circle, 17 px bold question, 13.5 px muted body,
 * 13 px bold rose money line, 50 px rose "Yes, cancel booking", 46 px text-only "Keep booking".
 */
@Composable
internal fun CancelBookingDialog(outcome: RefundOutcome, onConfirm: () -> Unit, onDismiss: () -> Unit) {
    val colors = AppTheme.colors
    val spacing = AppTheme.spacing
    Dialog(onDismissRequest = onDismiss) {
        Column(
            modifier = Modifier
                .widthIn(max = AppTheme.sizes.dialogMaxWidth)
                .fillMaxWidth()
                .background(colors.card, RoundedCornerShape(BookingsDesign.dialogRadius))
                .padding(start = BookingsDesign.dialogPadding, end = BookingsDesign.dialogPadding)
                .padding(top = BookingsDesign.dialogTopPadding, bottom = spacing.space20),
            horizontalAlignment = Alignment.CenterHorizontally,
        ) {
            Box(
                modifier = Modifier.size(AppTheme.sizes.dialogIcon).background(colors.dangerContainer, AppTheme.shapes.circle),
                contentAlignment = Alignment.Center,
            ) {
                AppText(
                    text = BookingsDesign.DIALOG_ICON_TEXT,
                    style = AppTheme.typography.titleLarge.copy(fontSize = BookingsDesign.fontDialogIcon, fontWeight = FontWeight.Bold),
                    color = colors.danger,
                )
            }
            AppText(
                text = stringResource(Res.string.details_cancel_title),
                style = AppTheme.typography.titleLarge.copy(fontSize = BookingsDesign.fontDialogTitle, fontWeight = FontWeight.Bold),
                textAlign = TextAlign.Center,
                modifier = Modifier.padding(top = spacing.space14, bottom = spacing.space8),
            )
            AppText(
                text = stringResource(Res.string.details_cancel_body),
                style = AppTheme.typography.bodyMedium.copy(
                    fontSize = BookingsDesign.fontBodyPlus,
                    lineHeight = BookingsDesign.lineHeightBodyPlus,
                ),
                color = colors.muted,
                textAlign = TextAlign.Center,
                modifier = Modifier.padding(bottom = spacing.space8),
            )
            AppText(
                text = stringResource(outcome.messageRes()),
                style = AppTheme.typography.bodyMedium.copy(fontSize = BookingsDesign.fontBody, fontWeight = FontWeight.Bold),
                color = colors.danger,
                textAlign = TextAlign.Center,
                modifier = Modifier.padding(bottom = BookingsDesign.dialogMoneyBottomPadding),
            )
            DialogButton(
                text = stringResource(Res.string.details_cancel_confirm),
                height = BookingsDesign.dialogConfirmHeight,
                background = colors.danger,
                textColor = colors.onGradient,
                fontSize = BookingsDesign.fontTitle,
                onClick = onConfirm,
            )
            DialogButton(
                text = stringResource(Res.string.details_cancel_dismiss),
                height = BookingsDesign.dialogDismissHeight,
                background = null,
                textColor = colors.muted,
                fontSize = AppTheme.typography.bodyMedium.fontSize,
                onClick = onDismiss,
                modifier = Modifier.padding(top = spacing.space8),
            )
        }
    }
}

@Composable
private fun DialogButton(
    text: String,
    height: Dp,
    background: Color?,
    textColor: Color,
    fontSize: TextUnit,
    onClick: () -> Unit,
    modifier: Modifier = Modifier,
) {
    val shape = AppTheme.shapes.medium
    Box(
        modifier = modifier
            .fillMaxWidth()
            .height(height)
            .then(if (background != null) Modifier.background(background, shape) else Modifier)
            .clickable(role = Role.Button, onClick = onClick),
        contentAlignment = Alignment.Center,
    ) {
        AppText(text = text, style = AppTheme.typography.labelLarge.copy(fontSize = fontSize), color = textColor, maxLines = 1)
    }
}

private fun RefundOutcome.messageRes() = when (this) {
    RefundOutcome.FULL_REFUND -> Res.string.details_refund_full
    RefundOutcome.DEPOSIT_KEPT -> Res.string.details_refund_deposit_kept
    RefundOutcome.DEPOSIT_DEDUCTED -> Res.string.details_refund_deposit_deducted
    RefundOutcome.NOTHING_PAID -> Res.string.details_refund_nothing
}
