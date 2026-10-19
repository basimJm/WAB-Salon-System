package com.fab.wab.customer.feature.booking.presentation.screen

import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.verticalScroll
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.semantics.Role
import com.fab.wab.customer.core.common.TimeFormat
import com.fab.wab.customer.core.domain.booking.PaymentMethod
import com.fab.wab.customer.designsystem.components.badge.AppStatusBadge
import com.fab.wab.customer.designsystem.components.badge.StatusTone
import com.fab.wab.customer.designsystem.components.card.AppCard
import com.fab.wab.customer.designsystem.components.control.AppRadioButton
import com.fab.wab.customer.designsystem.components.feedback.AppErrorState
import com.fab.wab.customer.designsystem.components.section.AppSectionHeader
import com.fab.wab.customer.designsystem.components.shimmer.AppShimmerList
import com.fab.wab.customer.designsystem.components.text.AppText
import com.fab.wab.customer.designsystem.resources.Res as CoreRes
import com.fab.wab.customer.designsystem.resources.price_jod
import com.fab.wab.customer.designsystem.resources.time_am
import com.fab.wab.customer.designsystem.resources.time_pm
import com.fab.wab.customer.designsystem.theme.AppTheme
import com.fab.wab.customer.feature.booking.domain.model.BookingDraft
import com.fab.wab.customer.feature.booking.domain.model.DraftPersonResult
import com.fab.wab.customer.feature.booking.presentation.controller.contract.BookingFlowContract.UiAction
import com.fab.wab.customer.feature.booking.presentation.controller.contract.BookingFlowContract.UiState
import com.fab.wab.customer.feature.booking.presentation.resources.Res
import com.fab.wab.customer.feature.booking.presentation.resources.booking_bride_badge
import com.fab.wab.customer.feature.booking.presentation.resources.booking_grand_total
import com.fab.wab.customer.feature.booking.presentation.resources.booking_pay_deposit
import com.fab.wab.customer.feature.booking.presentation.resources.booking_pay_full
import com.fab.wab.customer.feature.booking.presentation.resources.booking_pay_on_arrival
import com.fab.wab.customer.feature.booking.presentation.resources.booking_payment_title
import com.fab.wab.customer.feature.booking.presentation.resources.booking_rules_approval
import com.fab.wab.customer.feature.booking.presentation.resources.booking_rules_deposit
import com.fab.wab.customer.feature.booking.presentation.resources.booking_rules_deposit_non_refundable
import com.fab.wab.customer.feature.booking.presentation.resources.booking_rules_deposit_refundable
import com.fab.wab.customer.feature.booking.presentation.resources.booking_rules_title
import com.fab.wab.customer.feature.booking.presentation.resources.booking_rules_window
import com.fab.wab.customer.feature.booking.presentation.resources.booking_staff_any
import com.fab.wab.customer.feature.booking.presentation.resources.booking_staff_label
import com.fab.wab.customer.feature.booking.presentation.resources.booking_summary_title
import org.jetbrains.compose.resources.stringResource

/** Step 5 (PRD S16): per-person blocks, grand total, salon rules, payment method among the salon's options. */
@Composable
internal fun SummaryStep(state: UiState, onAction: (UiAction) -> Unit) {
    val spacing = AppTheme.spacing
    val draft = state.draft
    when {
        state.draftLoading && draft == null -> AppShimmerList(Modifier.padding(spacing.space16))
        state.draftError != null && draft == null ->
            AppErrorState(onRetry = { onAction(UiAction.OnBack) }, message = state.draftError, modifier = Modifier.fillMaxSize())
        draft != null -> SummaryBody(draft, onAction)
    }
}

@Composable
private fun SummaryBody(draft: BookingDraft, onAction: (UiAction) -> Unit) {
    val spacing = AppTheme.spacing
    Column(
        modifier = Modifier.fillMaxSize().verticalScroll(rememberScrollState()).padding(spacing.space16),
        verticalArrangement = Arrangement.spacedBy(spacing.space16),
    ) {
        AppText(text = stringResource(Res.string.booking_summary_title), style = AppTheme.typography.headlineSmall)
        draft.persons.forEach { PersonSummary(it) }
        Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween) {
            AppText(text = stringResource(Res.string.booking_grand_total), style = AppTheme.typography.titleMedium)
            AppText(text = stringResource(CoreRes.string.price_jod, draft.money.total), style = AppTheme.typography.titleMedium)
        }
        RulesBlock(draft)
        PaymentBlock(draft, onAction)
    }
}

@Composable
private fun PersonSummary(person: DraftPersonResult) {
    val spacing = AppTheme.spacing
    val am = stringResource(CoreRes.string.time_am)
    val pm = stringResource(CoreRes.string.time_pm)
    val start = TimeFormat.instantText(person.start, am, pm)
    AppCard(modifier = Modifier.fillMaxWidth()) {
        Column(verticalArrangement = Arrangement.spacedBy(spacing.space4)) {
            Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(spacing.space8)) {
                AppText(text = person.name, style = AppTheme.typography.titleSmall)
                if (person.isBride) AppStatusBadge(text = stringResource(Res.string.booking_bride_badge), tone = StatusTone.Accent)
            }
            person.services.forEach { line ->
                Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween) {
                    AppText(text = line.name, color = AppTheme.colors.muted)
                    AppText(text = stringResource(CoreRes.string.price_jod, line.price))
                }
            }
            val staff = if (person.staffIsAny) stringResource(Res.string.booking_staff_any) else person.staffFirstName
            AppText(text = stringResource(Res.string.booking_staff_label, staff), color = AppTheme.colors.muted)
            AppText(text = listOfNotNull(start?.date, start?.time).joinToString(DATE_TIME_SEPARATOR), color = AppTheme.colors.muted)
        }
    }
}

/** Salon rules block (PRD S16 step 5): window, deposit %, refund rule, approval note. */
@Composable
private fun RulesBlock(draft: BookingDraft) {
    val policy = draft.policy
    val muted = AppTheme.colors.muted
    Column(verticalArrangement = Arrangement.spacedBy(AppTheme.spacing.space4)) {
        AppSectionHeader(title = stringResource(Res.string.booking_rules_title))
        AppText(text = stringResource(Res.string.booking_rules_window, policy.cancellationWindowHours.toInt()), color = muted)
        policy.depositPercentage?.let { AppText(text = stringResource(Res.string.booking_rules_deposit, it.toInt()), color = muted) }
        val refundRes = if (policy.depositRefundableOnCustomerCancel) {
            Res.string.booking_rules_deposit_refundable
        } else {
            Res.string.booking_rules_deposit_non_refundable
        }
        AppText(text = stringResource(refundRes), color = muted)
        AppText(text = stringResource(Res.string.booking_rules_approval), color = muted)
        policy.notes?.let { AppText(text = it, color = muted) }
    }
}

@Composable
private fun PaymentBlock(draft: BookingDraft, onAction: (UiAction) -> Unit) {
    Column(verticalArrangement = Arrangement.spacedBy(AppTheme.spacing.space4)) {
        AppSectionHeader(title = stringResource(Res.string.booking_payment_title))
        draft.policy.paymentOptions.forEach { option ->
            val label = when (option) {
                PaymentMethod.PAY_ON_ARRIVAL -> stringResource(Res.string.booking_pay_on_arrival)
                PaymentMethod.DEPOSIT -> stringResource(
                    Res.string.booking_pay_deposit,
                    draft.policy.depositPercentage?.toInt() ?: 0,
                    draft.money.deposit,
                )
                PaymentMethod.FULL_ONLINE -> stringResource(Res.string.booking_pay_full, draft.money.total)
                PaymentMethod.UNKNOWN -> return@forEach
            }
            Row(
                modifier = Modifier.fillMaxWidth().clickable(role = Role.RadioButton) { onAction(UiAction.OnPaymentMethodSelect(option)) },
                verticalAlignment = Alignment.CenterVertically,
            ) {
                AppRadioButton(selected = draft.paymentMethod == option, onClick = { onAction(UiAction.OnPaymentMethodSelect(option)) })
                AppText(text = label)
            }
        }
    }
}

private const val DATE_TIME_SEPARATOR = " "
