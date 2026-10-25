package com.fab.wab.customer.feature.booking.presentation.screen

import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.ExperimentalLayoutApi
import androidx.compose.foundation.layout.FlowRow
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.verticalScroll
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import com.fab.wab.customer.core.domain.booking.PaymentMethod
import com.fab.wab.customer.core.domain.salon.SalonBranch
import com.fab.wab.customer.feature.booking.presentation.controller.vm.DraftCoordinator
import com.fab.wab.customer.designsystem.components.feedback.AppErrorState
import com.fab.wab.customer.designsystem.components.text.AppText
import com.fab.wab.customer.designsystem.resources.Res as CoreRes
import com.fab.wab.customer.designsystem.resources.price_jod
import com.fab.wab.customer.designsystem.theme.AppTheme
import com.fab.wab.customer.feature.booking.domain.model.BookingDraft
import com.fab.wab.customer.feature.booking.domain.model.DraftPersonResult
import com.fab.wab.customer.feature.booking.presentation.controller.contract.BookingFlowContract.UiAction
import com.fab.wab.customer.feature.booking.presentation.controller.contract.BookingFlowContract.UiState
import com.fab.wab.customer.feature.booking.presentation.resources.Res
import com.fab.wab.customer.feature.booking.presentation.resources.booking_grand_total
import com.fab.wab.customer.feature.booking.presentation.resources.booking_pay_deposit
import com.fab.wab.customer.feature.booking.presentation.resources.booking_pay_deposit_sub
import com.fab.wab.customer.feature.booking.presentation.resources.booking_pay_full
import com.fab.wab.customer.feature.booking.presentation.resources.booking_pay_full_sub
import com.fab.wab.customer.feature.booking.presentation.resources.booking_pay_on_arrival
import com.fab.wab.customer.feature.booking.presentation.resources.booking_pay_on_arrival_sub
import com.fab.wab.customer.feature.booking.presentation.resources.booking_pay_online_soon
import com.fab.wab.customer.feature.booking.presentation.resources.booking_payment_title
import com.fab.wab.customer.feature.booking.presentation.resources.booking_rules_title
import com.fab.wab.customer.feature.booking.presentation.resources.booking_staff_any
import com.fab.wab.customer.feature.booking.presentation.resources.booking_summary_title
import org.jetbrains.compose.resources.stringResource

/**
 * Step 5 (`st.s5`): title `mb 14`, one bordered card per person (`gap:10px`), the soft total row `mt 10`, the surface
 * rules box `mt 16`, "Payment method" `15px 700 margin 18 0 10` and one `card(sel)` per payment option (`gap:8px`).
 */
@Composable
internal fun SummaryStep(state: UiState, onAction: (UiAction) -> Unit) {
    val spacing = AppTheme.spacing
    val draft = state.draft
    when {
        state.draftLoading && draft == null -> ShimmerRows(BookingDesignConstants.serviceShimmerHeight, Modifier.padding(spacing.space20))
        state.draftError != null && draft == null ->
            AppErrorState(onRetry = { onAction(UiAction.OnBack) }, message = state.draftError, modifier = Modifier.fillMaxSize())
        draft != null -> SummaryBody(draft, state.selectedBranch, onAction)
    }
}

@Composable
private fun SummaryBody(draft: BookingDraft, branch: SalonBranch?, onAction: (UiAction) -> Unit) {
    val spacing = AppTheme.spacing
    val colors = AppTheme.colors
    Column(
        modifier = Modifier
            .fillMaxSize()
            .verticalScroll(rememberScrollState())
            .padding(start = spacing.space20, top = spacing.space4, end = spacing.space20, bottom = spacing.space20),
    ) {
        StepTitle(text = stringResource(Res.string.booking_summary_title), modifier = Modifier.padding(bottom = spacing.space14))
        branch?.let { SummaryBranch(it, Modifier.padding(bottom = spacing.space10)) }
        Column(verticalArrangement = Arrangement.spacedBy(spacing.space10)) { draft.persons.forEach { PersonSummary(it) } }
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .padding(top = spacing.space10)
                .clip(AppTheme.shapes.large)
                .background(colors.soft)
                .padding(horizontal = spacing.space16, vertical = spacing.space14),
            horizontalArrangement = Arrangement.SpaceBetween,
            verticalAlignment = Alignment.CenterVertically,
        ) {
            AppText(text = stringResource(Res.string.booking_grand_total), style = AppTheme.typography.titleSmall)
            AppText(
                text = stringResource(CoreRes.string.price_jod, draft.money.total),
                style = AppTheme.typography.titleLarge,
                color = colors.accent,
            )
        }
        RulesBlock(draft, Modifier.padding(top = spacing.space16))
        AppText(
            text = stringResource(Res.string.booking_payment_title),
            modifier = Modifier.padding(top = spacing.space20, bottom = spacing.space10),
            style = AppTheme.typography.titleMedium,
        )
        Column(verticalArrangement = Arrangement.spacedBy(spacing.space8)) {
            draft.policy.paymentOptions.forEach { option ->
                val texts = paymentOptionTexts(option, draft) ?: return@forEach
                val enabled = option in DraftCoordinator.ENABLED_METHODS
                SelectionCard(
                    selected = draft.paymentMethod == option,
                    onClick = { onAction(UiAction.OnPaymentMethodSelect(option)) },
                    enabled = enabled,
                ) {
                    DesignRadio(draft.paymentMethod == option)
                    Column(modifier = Modifier.weight(1f), verticalArrangement = Arrangement.spacedBy(spacing.space2)) {
                        AppText(text = texts.first, style = AppTheme.typography.titleSmall)
                        AppText(
                            text = if (enabled) texts.second else stringResource(Res.string.booking_pay_online_soon),
                            style = AppTheme.typography.bodySmall,
                            color = colors.muted,
                        )
                    }
                }
            }
        }
    }
}

/**
 * Design `sumPersons`: `padding:14px;border-radius:18px;border:1px solid var(--line)`; name row `mb 8`, service lines
 * `13px padding 3px 0` with `600` prices, dashed top border footer (`gap:6px 14px;12px muted`) with staff and time.
 */
@OptIn(ExperimentalLayoutApi::class)
@Composable
private fun PersonSummary(person: DraftPersonResult) {
    val spacing = AppTheme.spacing
    val colors = AppTheme.colors
    val shape = roundedShape(BookingDesignConstants.summaryCardRadius)
    Column(modifier = Modifier.fillMaxWidth().border(AppTheme.sizes.hairline, colors.line, shape).padding(spacing.space14)) {
        PersonNameRow(name = person.name, isBride = person.isBride, modifier = Modifier.padding(bottom = spacing.space8))
        person.services.forEach { line ->
            Row(
                modifier = Modifier.fillMaxWidth().padding(vertical = spacing.space2),
                horizontalArrangement = Arrangement.SpaceBetween,
            ) {
                AppText(text = line.name, modifier = Modifier.weight(1f), style = AppTheme.typography.bodyMedium)
                AppText(text = stringResource(CoreRes.string.price_jod, line.price), style = AppTheme.typography.titleSmall)
            }
        }
        DashedDivider(Modifier.padding(top = spacing.space8))
        FlowRow(
            modifier = Modifier.fillMaxWidth().padding(top = spacing.space8),
            horizontalArrangement = Arrangement.spacedBy(spacing.space14),
            verticalArrangement = Arrangement.spacedBy(spacing.space6),
        ) {
            val staff = if (person.staffIsAny) stringResource(Res.string.booking_staff_any) else person.staffFirstName
            AppText(text = staff, style = AppTheme.typography.bodySmall, color = colors.muted)
            AppText(text = whenText(dateIso = null, startIso = person.start), style = AppTheme.typography.bodySmall, color = colors.muted)
        }
    }
}

/** Design `rules`: `padding:14px 16px;border-radius:16px;background:var(--surface)`, title `14px 700 mb 8`, accent bullets. */
@Composable
private fun RulesBlock(draft: BookingDraft, modifier: Modifier = Modifier) {
    val spacing = AppTheme.spacing
    val colors = AppTheme.colors
    Column(
        modifier = modifier
            .fillMaxWidth()
            .clip(AppTheme.shapes.large)
            .background(colors.surface)
            .padding(horizontal = spacing.space16, vertical = spacing.space14),
    ) {
        AppText(
            text = stringResource(Res.string.booking_rules_title),
            modifier = Modifier.padding(bottom = spacing.space8),
            style = AppTheme.typography.titleSmall,
        )
        rulesOf(draft).forEach { rule ->
            Row(modifier = Modifier.padding(vertical = spacing.space2), horizontalArrangement = Arrangement.spacedBy(spacing.space8)) {
                AppText(text = BULLET, style = AppTheme.typography.bodySmall, color = colors.accent)
                AppText(text = rule, style = AppTheme.typography.bodySmall, color = colors.muted)
            }
        }
    }
}

/** Payment option label + subtitle (`t.arrival/arrivalSub`, `t.deposit = x JOD/depositSub`, `t.fullPay/fullSub`). */
@Composable
private fun paymentOptionTexts(option: PaymentMethod, draft: BookingDraft): Pair<String, String>? = when (option) {
    PaymentMethod.PAY_ON_ARRIVAL ->
        stringResource(Res.string.booking_pay_on_arrival) to stringResource(Res.string.booking_pay_on_arrival_sub)
    PaymentMethod.DEPOSIT -> stringResource(
        Res.string.booking_pay_deposit,
        draft.policy.depositPercentage?.toInt() ?: 0,
        draft.money.deposit,
    ) to stringResource(Res.string.booking_pay_deposit_sub)
    PaymentMethod.FULL_ONLINE -> stringResource(Res.string.booking_pay_full) to stringResource(Res.string.booking_pay_full_sub)
    PaymentMethod.UNKNOWN -> null
}

private const val BULLET = "•"
