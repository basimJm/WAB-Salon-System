package com.fab.wab.merchant.feature.finance.presentation.screen

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.font.FontWeight
import com.fab.wab.merchant.core.common.TimeFormat
import com.fab.wab.merchant.core.domain.booking.RefundStatus
import com.fab.wab.merchant.designsystem.components.badge.AppStatusBadge
import com.fab.wab.merchant.designsystem.components.badge.StatusTone
import com.fab.wab.merchant.designsystem.components.card.AppCard
import com.fab.wab.merchant.designsystem.components.format.jodText
import com.fab.wab.merchant.designsystem.components.text.AppText
import com.fab.wab.merchant.designsystem.theme.AppTheme
import com.fab.wab.merchant.feature.finance.domain.PaymentType
import com.fab.wab.merchant.feature.finance.domain.Payout
import com.fab.wab.merchant.feature.finance.domain.PayoutStatus
import com.fab.wab.merchant.feature.finance.domain.Refund
import com.fab.wab.merchant.feature.finance.domain.RefundSource
import com.fab.wab.merchant.feature.finance.domain.Transaction
import com.fab.wab.merchant.feature.finance.presentation.controller.contract.FinanceContract.UiAction
import com.fab.wab.merchant.feature.finance.presentation.resources.Res
import com.fab.wab.merchant.feature.finance.presentation.resources.adjustments
import com.fab.wab.merchant.feature.finance.presentation.resources.amount
import com.fab.wab.merchant.feature.finance.presentation.resources.booking_ref
import com.fab.wab.merchant.feature.finance.presentation.resources.completed
import com.fab.wab.merchant.feature.finance.presentation.resources.fee
import com.fab.wab.merchant.feature.finance.presentation.resources.fees
import com.fab.wab.merchant.feature.finance.presentation.resources.gross
import com.fab.wab.merchant.feature.finance.presentation.resources.net
import com.fab.wab.merchant.feature.finance.presentation.resources.payout_pending
import com.fab.wab.merchant.feature.finance.presentation.resources.payout_transferred
import com.fab.wab.merchant.feature.finance.presentation.resources.period
import com.fab.wab.merchant.feature.finance.presentation.resources.range_text
import com.fab.wab.merchant.feature.finance.presentation.resources.refund_done
import com.fab.wab.merchant.feature.finance.presentation.resources.refund_failed
import com.fab.wab.merchant.feature.finance.presentation.resources.refund_pending
import com.fab.wab.merchant.feature.finance.presentation.resources.refunds_deducted
import com.fab.wab.merchant.feature.finance.presentation.resources.requested
import com.fab.wab.merchant.feature.finance.presentation.resources.source_admin
import com.fab.wab.merchant.feature.finance.presentation.resources.source_auto_cancel
import com.fab.wab.merchant.feature.finance.presentation.resources.source_customer_cancel
import com.fab.wab.merchant.feature.finance.presentation.resources.source_no_show
import com.fab.wab.merchant.feature.finance.presentation.resources.source_other
import com.fab.wab.merchant.feature.finance.presentation.resources.source_salon_cancel
import com.fab.wab.merchant.feature.finance.presentation.resources.source_salon_reject
import com.fab.wab.merchant.feature.finance.presentation.resources.transfer
import com.fab.wab.merchant.feature.finance.presentation.resources.type_deposit
import com.fab.wab.merchant.feature.finance.presentation.resources.type_full
import org.jetbrains.compose.resources.StringResource
import org.jetbrains.compose.resources.stringResource

private fun date(value: String?): String? = value?.let { TimeFormat.isoDateText(it) }

@Composable
internal fun TransactionRow(transaction: Transaction, onAction: (UiAction) -> Unit) {
    val bookingId = transaction.bookingId
    AppCard(modifier = Modifier.fillMaxWidth(), onClick = bookingId?.let { { onAction(UiAction.OnBooking(it)) } }) {
        Column(verticalArrangement = Arrangement.spacedBy(AppTheme.spacing.space4)) {
            TitleRow(
                title = transaction.reference?.let { stringResource(Res.string.booking_ref, it) }.orEmpty(),
                badge = stringResource(if (transaction.type == PaymentType.DEPOSIT) Res.string.type_deposit else Res.string.type_full),
                tone = StatusTone.Accent,
            )
            date(transaction.createdAt)?.let { Caption(it) }
            AmountLine(Res.string.amount, transaction.amount)
            AmountLine(Res.string.fee, transaction.gatewayFee)
            AmountLine(Res.string.net, transaction.net, bold = true)
        }
    }
}

@Composable
internal fun RefundRow(refund: Refund, onAction: (UiAction) -> Unit) {
    val bookingId = refund.bookingId
    val (status, tone) = when (refund.status) {
        RefundStatus.REFUNDED -> Res.string.refund_done to StatusTone.Success
        RefundStatus.REFUND_FAILED -> Res.string.refund_failed to StatusTone.Danger
        RefundStatus.REFUND_PENDING, RefundStatus.NONE -> Res.string.refund_pending to StatusTone.Warning
    }
    AppCard(modifier = Modifier.fillMaxWidth(), onClick = bookingId?.let { { onAction(UiAction.OnBooking(it)) } }) {
        Column(verticalArrangement = Arrangement.spacedBy(AppTheme.spacing.space4)) {
            TitleRow(refund.reference?.let { stringResource(Res.string.booking_ref, it) }.orEmpty(), stringResource(status), tone)
            AppText(text = refund.reason ?: stringResource(refund.source.label()), style = AppTheme.typography.bodySmall)
            AmountLine(Res.string.amount, refund.amount, bold = true)
            date(refund.createdAt)?.let { Caption(stringResource(Res.string.requested, it)) }
            date(refund.completedAt)?.let { Caption(stringResource(Res.string.completed, it)) }
        }
    }
}

@Composable
internal fun PayoutRow(payout: Payout) {
    val transferred = payout.status == PayoutStatus.TRANSFERRED
    AppCard(modifier = Modifier.fillMaxWidth()) {
        Column(verticalArrangement = Arrangement.spacedBy(AppTheme.spacing.space4)) {
            val from = date(payout.periodFrom)
            val to = date(payout.periodTo)
            val period = if (from != null && to != null) stringResource(Res.string.range_text, from, to) else from ?: to.orEmpty()
            TitleRow(
                stringResource(Res.string.period, period),
                stringResource(if (transferred) Res.string.payout_transferred else Res.string.payout_pending),
                if (transferred) StatusTone.Success else StatusTone.Warning,
            )
            AmountLine(Res.string.gross, payout.gross)
            AmountLine(Res.string.fees, payout.fees)
            AmountLine(Res.string.refunds_deducted, payout.refunds)
            AmountLine(Res.string.adjustments, payout.adjustments)
            AmountLine(Res.string.net, payout.net, bold = true)
            val transfer = listOfNotNull(date(payout.transferredAt), payout.transferReference).joinToString(REFERENCE_SEPARATOR)
            if (transfer.isNotEmpty()) Caption(stringResource(Res.string.transfer, transfer))
        }
    }
}

/** Joins the transfer date and bank reference ("12/10/2026 / TRX-1"). */
private const val REFERENCE_SEPARATOR = " / "

@Composable
private fun TitleRow(title: String, badge: String, tone: StatusTone) {
    Row(verticalAlignment = Alignment.CenterVertically) {
        AppText(text = title, style = AppTheme.typography.titleSmall.copy(fontWeight = FontWeight.Bold), modifier = Modifier.weight(1f))
        AppStatusBadge(text = badge, tone = tone)
    }
}

@Composable
private fun AmountLine(label: StringResource, amount: String, bold: Boolean = false) {
    val style = if (bold) AppTheme.typography.labelLarge.copy(fontWeight = FontWeight.Bold) else AppTheme.typography.bodySmall
    Row(modifier = Modifier.fillMaxWidth()) {
        AppText(text = stringResource(label), style = style, color = AppTheme.colors.muted, modifier = Modifier.weight(1f))
        AppText(text = jodText(amount), style = style)
    }
}

@Composable
private fun Caption(text: String) {
    AppText(text = text, style = AppTheme.typography.labelSmall, color = AppTheme.colors.faint)
}

private fun RefundSource.label(): StringResource = when (this) {
    RefundSource.SALON_REJECT -> Res.string.source_salon_reject
    RefundSource.SALON_CANCEL -> Res.string.source_salon_cancel
    RefundSource.AUTO_CANCEL -> Res.string.source_auto_cancel
    RefundSource.CUSTOMER_CANCEL -> Res.string.source_customer_cancel
    RefundSource.NO_SHOW_POLICY -> Res.string.source_no_show
    RefundSource.ADMIN -> Res.string.source_admin
    RefundSource.OTHER -> Res.string.source_other
}
