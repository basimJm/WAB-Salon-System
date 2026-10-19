package com.fab.wab.customer.feature.bookings.presentation.screen

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.platform.LocalClipboardManager
import androidx.compose.ui.text.AnnotatedString
import com.fab.wab.customer.core.common.TimeFormat
import com.fab.wab.customer.core.domain.booking.BookingDetails
import com.fab.wab.customer.core.domain.booking.BookingPerson
import com.fab.wab.customer.core.domain.booking.RefundStatus
import com.fab.wab.customer.designsystem.components.avatar.AppAvatar
import com.fab.wab.customer.designsystem.components.badge.AppStatusBadge
import com.fab.wab.customer.designsystem.components.badge.StatusTone
import com.fab.wab.customer.designsystem.components.button.AppOutlinedButton
import com.fab.wab.customer.designsystem.components.button.AppTextButton
import com.fab.wab.customer.designsystem.components.card.AppCard
import com.fab.wab.customer.designsystem.components.section.AppSectionHeader
import com.fab.wab.customer.designsystem.components.text.AppText
import com.fab.wab.customer.designsystem.icons.AppIcons
import com.fab.wab.customer.designsystem.resources.Res as CoreRes
import com.fab.wab.customer.designsystem.resources.price_jod
import com.fab.wab.customer.designsystem.resources.time_am
import com.fab.wab.customer.designsystem.resources.time_pm
import com.fab.wab.customer.designsystem.theme.AppTheme
import com.fab.wab.customer.feature.bookings.presentation.controller.contract.BookingDetailsContract.UiAction
import com.fab.wab.customer.feature.bookings.presentation.controller.contract.BookingDetailsContract.UiState
import com.fab.wab.customer.feature.bookings.presentation.resources.Res
import com.fab.wab.customer.feature.bookings.presentation.resources.booking_reference
import com.fab.wab.customer.feature.bookings.presentation.resources.details_bride
import com.fab.wab.customer.feature.bookings.presentation.resources.details_call
import com.fab.wab.customer.feature.bookings.presentation.resources.details_cancellation_reason
import com.fab.wab.customer.feature.bookings.presentation.resources.details_copy
import com.fab.wab.customer.feature.bookings.presentation.resources.details_paid
import com.fab.wab.customer.feature.bookings.presentation.resources.details_payment
import com.fab.wab.customer.feature.bookings.presentation.resources.details_persons
import com.fab.wab.customer.feature.bookings.presentation.resources.details_policy
import com.fab.wab.customer.feature.bookings.presentation.resources.details_policy_deposit
import com.fab.wab.customer.feature.bookings.presentation.resources.details_policy_deposit_refundable
import com.fab.wab.customer.feature.bookings.presentation.resources.details_policy_deposit_non_refundable
import com.fab.wab.customer.feature.bookings.presentation.resources.details_policy_window
import com.fab.wab.customer.feature.bookings.presentation.resources.details_refund_failed
import com.fab.wab.customer.feature.bookings.presentation.resources.details_refund_pending
import com.fab.wab.customer.feature.bookings.presentation.resources.details_refunded
import com.fab.wab.customer.feature.bookings.presentation.resources.details_rejection_reason
import com.fab.wab.customer.feature.bookings.presentation.resources.details_remaining
import com.fab.wab.customer.feature.bookings.presentation.resources.details_staff
import com.fab.wab.customer.feature.bookings.presentation.resources.details_staff_any
import com.fab.wab.customer.feature.bookings.presentation.resources.details_total
import com.fab.wab.customer.feature.bookings.presentation.resources.details_whatsapp
import org.jetbrains.compose.resources.StringResource
import org.jetbrains.compose.resources.stringResource

@Composable
internal fun StatusBlock(booking: BookingDetails) {
    val spacing = AppTheme.spacing
    val clipboard = LocalClipboardManager.current
    AppCard(modifier = Modifier.fillMaxWidth()) {
        Column(verticalArrangement = Arrangement.spacedBy(spacing.space8)) {
            Row(horizontalArrangement = Arrangement.spacedBy(spacing.space8)) {
                val (statusRes, tone) = booking.status.label()
                AppStatusBadge(text = stringResource(statusRes), tone = tone)
                AppStatusBadge(text = stringResource(booking.paymentStatus.label()), tone = StatusTone.Neutral)
                booking.refundStatus.labelRes()?.let { AppStatusBadge(text = stringResource(it), tone = StatusTone.Accent) }
            }
            Row(modifier = Modifier.fillMaxWidth(), verticalAlignment = Alignment.CenterVertically) {
                AppText(text = stringResource(Res.string.booking_reference, booking.referenceNumber), modifier = Modifier.weight(1f))
                AppTextButton(
                    text = stringResource(Res.string.details_copy),
                    onClick = { clipboard.setText(AnnotatedString(booking.referenceNumber)) },
                )
            }
        }
    }
}

@Composable
internal fun ReasonBlock(booking: BookingDetails) {
    val reason = booking.rejection?.let { Res.string.details_rejection_reason to it }
        ?: booking.cancellation?.let { Res.string.details_cancellation_reason to it }
    val (labelRes, value) = reason ?: return
    AppText(text = stringResource(labelRes, value.text ?: value.code), color = AppTheme.colors.danger)
}

/** Salon name + image with Call / WhatsApp through the external-actions port (PRD S15 item 4). */
@Composable
internal fun SalonBlock(booking: BookingDetails, state: UiState, onAction: (UiAction) -> Unit) {
    val spacing = AppTheme.spacing
    AppCard(modifier = Modifier.fillMaxWidth()) {
        Column(verticalArrangement = Arrangement.spacedBy(spacing.space12)) {
            Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(spacing.space12)) {
                AppAvatar(name = booking.salonName.orEmpty(), imageUrl = state.salonImageUrl)
                AppText(text = booking.salonName.orEmpty(), style = AppTheme.typography.titleMedium)
            }
            if (state.salonPhone != null || state.salonWhatsApp != null) {
                Row(horizontalArrangement = Arrangement.spacedBy(spacing.space12), modifier = Modifier.fillMaxWidth()) {
                    state.salonPhone?.let {
                        AppOutlinedButton(
                            text = stringResource(Res.string.details_call),
                            onClick = { onAction(UiAction.OnCallClick) },
                            modifier = Modifier.weight(1f),
                            leadingIcon = AppIcons.Call,
                        )
                    }
                    state.salonWhatsApp?.let {
                        AppOutlinedButton(
                            text = stringResource(Res.string.details_whatsapp),
                            onClick = { onAction(UiAction.OnWhatsAppClick) },
                            modifier = Modifier.weight(1f),
                            leadingIcon = AppIcons.Chat,
                        )
                    }
                }
            }
        }
    }
}

@Composable
internal fun PersonsBlock(booking: BookingDetails) {
    val spacing = AppTheme.spacing
    Column(verticalArrangement = Arrangement.spacedBy(spacing.space8)) {
        AppSectionHeader(title = stringResource(Res.string.details_persons))
        booking.persons.forEach { PersonCard(it) }
    }
}

@Composable
private fun PersonCard(person: BookingPerson) {
    val spacing = AppTheme.spacing
    val am = stringResource(CoreRes.string.time_am)
    val pm = stringResource(CoreRes.string.time_pm)
    val start = TimeFormat.instantText(person.start, am, pm)
    AppCard(modifier = Modifier.fillMaxWidth()) {
        Column(verticalArrangement = Arrangement.spacedBy(spacing.space4)) {
            Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(spacing.space8)) {
                AppText(text = person.name, style = AppTheme.typography.titleSmall)
                if (person.isBride) AppStatusBadge(text = stringResource(Res.string.details_bride), tone = StatusTone.Accent)
            }
            person.services.forEach { service ->
                Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween) {
                    AppText(text = service.name, color = AppTheme.colors.muted)
                    AppText(text = stringResource(CoreRes.string.price_jod, service.price))
                }
            }
            AppText(
                text = stringResource(Res.string.details_staff, person.staffName ?: stringResource(Res.string.details_staff_any)),
                color = AppTheme.colors.muted,
            )
            AppText(text = listOfNotNull(start?.date, start?.time).joinToString(DATE_TIME_SEPARATOR), color = AppTheme.colors.muted)
        }
    }
}

/** Total, paid online, remaining at the salon (PRD S15 item 6). */
@Composable
internal fun PaymentBlock(booking: BookingDetails) {
    val spacing = AppTheme.spacing
    Column(verticalArrangement = Arrangement.spacedBy(spacing.space8)) {
        AppSectionHeader(title = stringResource(Res.string.details_payment))
        MoneyRow(Res.string.details_total, booking.money.total)
        MoneyRow(Res.string.details_paid, booking.money.paidOnline)
        MoneyRow(Res.string.details_remaining, booking.money.remaining)
        if (booking.refundStatus == RefundStatus.REFUNDED) MoneyRow(Res.string.details_refunded, booking.money.refunded)
    }
}

@Composable
private fun MoneyRow(labelRes: StringResource, amount: String) {
    Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween) {
        AppText(text = stringResource(labelRes), color = AppTheme.colors.muted)
        AppText(text = stringResource(CoreRes.string.price_jod, amount), style = AppTheme.typography.titleSmall)
    }
}

/** Policy snapshot at booking time (PRD S15 item 7); hidden when the server sent none. */
@Composable
internal fun PolicyBlock(booking: BookingDetails) {
    val policy = booking.policy ?: return
    val spacing = AppTheme.spacing
    Column(verticalArrangement = Arrangement.spacedBy(spacing.space4)) {
        AppSectionHeader(title = stringResource(Res.string.details_policy))
        val muted = AppTheme.colors.muted
        AppText(text = stringResource(Res.string.details_policy_window, policy.cancellationWindowHours.toInt()), color = muted)
        policy.depositPercentage?.let { AppText(text = stringResource(Res.string.details_policy_deposit, it.toInt()), color = muted) }
        val refundRes = if (policy.depositRefundableOnCustomerCancel) {
            Res.string.details_policy_deposit_refundable
        } else {
            Res.string.details_policy_deposit_non_refundable
        }
        AppText(text = stringResource(refundRes), color = muted)
        policy.notes?.let { AppText(text = it, color = muted) }
    }
}

private fun RefundStatus.labelRes() = when (this) {
    RefundStatus.REFUND_PENDING -> Res.string.details_refund_pending
    RefundStatus.REFUNDED -> Res.string.details_refunded
    RefundStatus.REFUND_FAILED -> Res.string.details_refund_failed
    RefundStatus.NONE, RefundStatus.UNKNOWN -> null
}
