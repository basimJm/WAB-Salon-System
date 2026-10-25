package com.fab.wab.merchant.feature.salon.presentation.screen

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.verticalScroll
import androidx.compose.material3.Icon
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import com.fab.wab.merchant.designsystem.components.button.AppButton
import com.fab.wab.merchant.designsystem.components.button.ButtonKind
import com.fab.wab.merchant.designsystem.components.card.AppCard
import com.fab.wab.merchant.designsystem.components.dialog.AppBottomSheet
import com.fab.wab.merchant.designsystem.components.selector.AppSegmentedTabs
import com.fab.wab.merchant.designsystem.components.text.AppText
import com.fab.wab.merchant.designsystem.icons.AppIcons
import com.fab.wab.merchant.designsystem.theme.AppTheme
import com.fab.wab.merchant.core.analytics.compose.TrackScreen
import com.fab.wab.merchant.core.domain.policy.FullPaymentRefund
import com.fab.wab.merchant.core.domain.policy.NoShowDeposit
import com.fab.wab.merchant.core.domain.policy.NoShowFullPayment
import com.fab.wab.merchant.core.domain.policy.PaymentOption
import com.fab.wab.merchant.feature.salon.domain.PolicyDraft
import com.fab.wab.merchant.feature.salon.domain.customerRules
import com.fab.wab.merchant.designsystem.components.policy.policyRuleText
import com.fab.wab.merchant.feature.salon.presentation.analytics.SalonAnalytics
import com.fab.wab.merchant.feature.salon.presentation.controller.contract.PolicyContract.UiAction
import com.fab.wab.merchant.feature.salon.presentation.controller.contract.PolicyContract.UiState
import com.fab.wab.merchant.feature.salon.presentation.resources.Res
import com.fab.wab.merchant.feature.salon.presentation.resources.policy_cancel
import com.fab.wab.merchant.feature.salon.presentation.resources.policy_cancel_sub
import com.fab.wab.merchant.feature.salon.presentation.resources.policy_close
import com.fab.wab.merchant.feature.salon.presentation.resources.policy_deposit_ref
import com.fab.wab.merchant.feature.salon.presentation.resources.policy_full_ref
import com.fab.wab.merchant.feature.salon.presentation.resources.policy_keep
import com.fab.wab.merchant.feature.salon.presentation.resources.policy_no_show
import com.fab.wab.merchant.feature.salon.presentation.resources.policy_no_show_sub
import com.fab.wab.merchant.feature.salon.presentation.resources.policy_non_refundable
import com.fab.wab.merchant.feature.salon.presentation.resources.policy_preview_note
import com.fab.wab.merchant.feature.salon.presentation.resources.policy_refund
import com.fab.wab.merchant.feature.salon.presentation.resources.policy_refund_full
import com.fab.wab.merchant.feature.salon.presentation.resources.policy_refund_minus
import com.fab.wab.merchant.feature.salon.presentation.resources.policy_refundable
import com.fab.wab.merchant.feature.salon.presentation.resources.policy_rules
import org.jetbrains.compose.resources.stringResource

/** Cancellation and no-show outcomes; each block only for the options the salon offers. */
@Composable
internal fun OutcomeSections(state: UiState, onAction: (UiAction) -> Unit) {
    val draft = state.draft
    val deposit = PaymentOption.DEPOSIT in draft.options
    val full = PaymentOption.FULL_ONLINE in draft.options
    if (!deposit && !full) return
    Section(stringResource(Res.string.policy_cancel), stringResource(Res.string.policy_cancel_sub)) {
        if (deposit) {
            Choice(
                stringResource(Res.string.policy_deposit_ref),
                listOf(stringResource(Res.string.policy_refundable), stringResource(Res.string.policy_non_refundable)),
                if (draft.depositRefundable) 0 else 1,
            ) { onAction(UiAction.OnDepositRefundable(it == 0)) }
        }
        if (full) {
            Choice(
                stringResource(Res.string.policy_full_ref),
                listOf(stringResource(Res.string.policy_refund_full), stringResource(Res.string.policy_refund_minus)),
                FullPaymentRefund.entries.indexOf(draft.fullRefund),
            ) { onAction(UiAction.OnFullRefund(FullPaymentRefund.entries[it])) }
        }
    }
    Section(stringResource(Res.string.policy_no_show), stringResource(Res.string.policy_no_show_sub)) {
        if (deposit) {
            Choice(
                stringResource(Res.string.policy_deposit_ref),
                listOf(stringResource(Res.string.policy_keep), stringResource(Res.string.policy_refund)),
                NoShowDeposit.entries.indexOf(draft.noShowDeposit),
            ) { onAction(UiAction.OnNoShowDeposit(NoShowDeposit.entries[it])) }
        }
        if (full) {
            Choice(
                stringResource(Res.string.policy_full_ref),
                listOf(
                    stringResource(Res.string.policy_keep),
                    stringResource(Res.string.policy_refund_minus),
                    stringResource(Res.string.policy_refund_full),
                ),
                NoShowFullPayment.entries.indexOf(draft.noShowFull),
            ) { onAction(UiAction.OnNoShowFull(NoShowFullPayment.entries[it])) }
        }
    }
}

@Composable
private fun Choice(label: String, options: List<String>, selected: Int, onSelect: (Int) -> Unit) {
    Column(verticalArrangement = Arrangement.spacedBy(AppTheme.spacing.space6)) {
        AppText(text = label, style = AppTheme.typography.labelLarge)
        AppSegmentedTabs(tabs = options, selectedIndex = selected, onSelect = onSelect)
    }
}

/** The customer "Salon rules" block (design 07 `sh.preview`). */
@Composable
internal fun PolicyPreviewSheet(draft: PolicyDraft, onClose: () -> Unit) {
    val spacing = AppTheme.spacing
    TrackScreen(SalonAnalytics.SCREEN_POLICY_PREVIEW)
    AppBottomSheet(onDismiss = onClose) {
        Column(
            modifier = Modifier.fillMaxWidth().verticalScroll(rememberScrollState()).padding(spacing.space16),
            verticalArrangement = Arrangement.spacedBy(spacing.space10),
        ) {
            AppText(
                text = stringResource(Res.string.policy_preview_note),
                style = AppTheme.typography.bodySmall,
                color = AppTheme.colors.muted,
            )
            AppCard(modifier = Modifier.fillMaxWidth()) {
                Column(verticalArrangement = Arrangement.spacedBy(spacing.space8)) {
                    AppText(text = stringResource(Res.string.policy_rules), style = AppTheme.typography.titleSmall)
                    customerRules(draft).forEach { rule ->
                        Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(spacing.space8)) {
                            Icon(AppIcons.Check, contentDescription = null, tint = AppTheme.colors.accent)
                            AppText(text = policyRuleText(rule), style = AppTheme.typography.bodyMedium, modifier = Modifier.weight(1f))
                        }
                    }
                    if (draft.notes.isNotBlank()) AppText(
                        text = draft.notes.trim(),
                        style = AppTheme.typography.bodySmall,
                        color = AppTheme.colors.muted,
                    )
                }
            }
            AppButton(stringResource(Res.string.policy_close), onClose, Modifier.fillMaxWidth(), kind = ButtonKind.Outlined)
        }
    }
}
