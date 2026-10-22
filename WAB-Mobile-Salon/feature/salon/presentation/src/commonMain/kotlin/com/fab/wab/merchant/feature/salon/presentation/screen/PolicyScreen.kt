package com.fab.wab.merchant.feature.salon.presentation.screen

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.ExperimentalLayoutApi
import androidx.compose.foundation.layout.FlowRow
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.foundation.verticalScroll
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.input.KeyboardType
import com.fab.wab.merchant.core.analytics.compose.TrackScreen
import com.fab.wab.merchant.designsystem.components.button.AppButton
import com.fab.wab.merchant.designsystem.components.button.ButtonKind
import com.fab.wab.merchant.designsystem.components.card.AppCard
import com.fab.wab.merchant.designsystem.components.chip.AppFilterChip
import com.fab.wab.merchant.designsystem.components.control.AppCheckbox
import com.fab.wab.merchant.designsystem.components.feedback.AppErrorState
import com.fab.wab.merchant.designsystem.components.feedback.AppLoadingIndicator
import com.fab.wab.merchant.designsystem.components.format.jodTextOfFils
import com.fab.wab.merchant.designsystem.components.layout.AppScreen
import com.fab.wab.merchant.designsystem.components.navigation.AppTopBar
import com.fab.wab.merchant.designsystem.components.text.AppText
import com.fab.wab.merchant.designsystem.components.textfield.AppTextField
import com.fab.wab.merchant.designsystem.theme.AppTheme
import com.fab.wab.merchant.feature.salon.domain.PaymentOption
import com.fab.wab.merchant.feature.salon.domain.PolicyField
import com.fab.wab.merchant.feature.salon.domain.PolicyLimits
import com.fab.wab.merchant.feature.salon.domain.depositExampleFils
import com.fab.wab.merchant.feature.salon.presentation.analytics.SalonAnalytics
import com.fab.wab.merchant.feature.salon.presentation.controller.contract.PolicyContract.UiAction
import com.fab.wab.merchant.feature.salon.presentation.controller.contract.PolicyContract.UiState
import com.fab.wab.merchant.feature.salon.presentation.resources.Res
import com.fab.wab.merchant.feature.salon.presentation.resources.policy_arrival
import com.fab.wab.merchant.feature.salon.presentation.resources.policy_arrival_sub
import com.fab.wab.merchant.feature.salon.presentation.resources.policy_custom
import com.fab.wab.merchant.feature.salon.presentation.resources.policy_deposit
import com.fab.wab.merchant.feature.salon.presentation.resources.policy_deposit_error
import com.fab.wab.merchant.feature.salon.presentation.resources.policy_deposit_pct
import com.fab.wab.merchant.feature.salon.presentation.resources.policy_deposit_sub
import com.fab.wab.merchant.feature.salon.presentation.resources.policy_example
import com.fab.wab.merchant.feature.salon.presentation.resources.policy_full
import com.fab.wab.merchant.feature.salon.presentation.resources.policy_full_sub
import com.fab.wab.merchant.feature.salon.presentation.resources.policy_hours_before
import com.fab.wab.merchant.feature.salon.presentation.resources.policy_new_only
import com.fab.wab.merchant.feature.salon.presentation.resources.policy_notes
import com.fab.wab.merchant.feature.salon.presentation.resources.policy_notes_error
import com.fab.wab.merchant.feature.salon.presentation.resources.policy_notes_hint
import com.fab.wab.merchant.feature.salon.presentation.resources.policy_payment
import com.fab.wab.merchant.feature.salon.presentation.resources.policy_payment_error
import com.fab.wab.merchant.feature.salon.presentation.resources.policy_payment_sub
import com.fab.wab.merchant.feature.salon.presentation.resources.policy_preview
import com.fab.wab.merchant.feature.salon.presentation.resources.policy_save
import com.fab.wab.merchant.feature.salon.presentation.resources.policy_title
import com.fab.wab.merchant.feature.salon.presentation.resources.policy_window
import com.fab.wab.merchant.feature.salon.presentation.resources.policy_window_chip
import com.fab.wab.merchant.feature.salon.presentation.resources.policy_window_error
import com.fab.wab.merchant.feature.salon.presentation.resources.policy_window_sub
import org.jetbrains.compose.resources.StringResource
import org.jetbrains.compose.resources.stringResource

/** PRD M19 (design 07 `on.policies`). */
@Composable
fun PolicyScreen(state: UiState, onAction: (UiAction) -> Unit, onBack: () -> Unit, modifier: Modifier = Modifier) {
    TrackScreen(SalonAnalytics.SCREEN_POLICY)
    val spacing = AppTheme.spacing
    AppScreen(
        modifier = modifier,
        topBar = { AppTopBar(title = stringResource(Res.string.policy_title), onBack = onBack) },
        bottomBar = {
            if (!state.loading && state.error == null) {
                AppButton(
                    text = stringResource(Res.string.policy_save),
                    onClick = { onAction(UiAction.OnSave) },
                    modifier = Modifier.fillMaxWidth().padding(horizontal = spacing.space16, vertical = spacing.space10),
                    enabled = state.canSave,
                    loading = state.saving,
                )
            }
        },
    ) { padding ->
        when {
            state.loading -> Box(Modifier.fillMaxSize(), contentAlignment = Alignment.Center) { AppLoadingIndicator() }
            state.error != null -> AppErrorState(onRetry = { onAction(UiAction.OnRetry) }, message = state.error)
            else -> Column(
                modifier = Modifier.fillMaxSize().padding(padding).verticalScroll(rememberScrollState()).padding(spacing.space16),
                verticalArrangement = Arrangement.spacedBy(spacing.space14),
            ) {
                AppText(text = stringResource(Res.string.policy_new_only), style = AppTheme.typography.bodySmall, color = AppTheme.colors.muted)
                WindowSection(state, onAction)
                PaymentSection(state, onAction)
                OutcomeSections(state, onAction)
                AppTextField(
                    value = state.draft.notes,
                    onValueChange = { onAction(UiAction.OnNotes(it)) },
                    label = stringResource(Res.string.policy_notes),
                    placeholder = stringResource(Res.string.policy_notes_hint),
                    singleLine = false,
                    error = if (PolicyField.NOTES in state.visibleErrors) stringResource(Res.string.policy_notes_error) else null,
                )
                AppButton(stringResource(Res.string.policy_preview), { onAction(UiAction.OnPreview) }, Modifier.fillMaxWidth(), kind = ButtonKind.Outlined)
            }
        }
    }
    if (state.previewOpen) PolicyPreviewSheet(state.draft) { onAction(UiAction.OnClosePreview) }
}

@OptIn(ExperimentalLayoutApi::class)
@Composable
private fun WindowSection(state: UiState, onAction: (UiAction) -> Unit) {
    val spacing = AppTheme.spacing
    Section(stringResource(Res.string.policy_window), stringResource(Res.string.policy_window_sub)) {
        FlowRow(horizontalArrangement = Arrangement.spacedBy(spacing.space8), verticalArrangement = Arrangement.spacedBy(spacing.space8)) {
            PolicyLimits.WINDOW_PRESETS.forEach { hours ->
                AppFilterChip(stringResource(Res.string.policy_window_chip, hours), state.presetWindow == hours, { onAction(UiAction.OnWindowPreset(hours)) })
            }
            AppFilterChip(stringResource(Res.string.policy_custom), state.customWindow, { onAction(UiAction.OnWindowCustom) })
        }
        if (state.customWindow) {
            AppTextField(
                value = state.draft.windowHours,
                onValueChange = { onAction(UiAction.OnWindowText(it)) },
                label = stringResource(Res.string.policy_hours_before),
                keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Number),
            )
        }
        if (PolicyField.WINDOW in state.visibleErrors) Error(Res.string.policy_window_error)
    }
}

@Composable
private fun PaymentSection(state: UiState, onAction: (UiAction) -> Unit) {
    val draft = state.draft
    Section(stringResource(Res.string.policy_payment), stringResource(Res.string.policy_payment_sub)) {
        OptionRow(PaymentOption.PAY_ON_ARRIVAL, Res.string.policy_arrival, Res.string.policy_arrival_sub, draft.options, onAction)
        OptionRow(PaymentOption.DEPOSIT, Res.string.policy_deposit, Res.string.policy_deposit_sub, draft.options, onAction)
        if (PaymentOption.DEPOSIT in draft.options) {
            AppTextField(
                value = draft.depositPercentage,
                onValueChange = { onAction(UiAction.OnDeposit(it)) },
                label = stringResource(Res.string.policy_deposit_pct),
                keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Number),
                error = if (PolicyField.DEPOSIT in state.visibleErrors) stringResource(Res.string.policy_deposit_error) else null,
            )
            depositExampleFils(draft.depositPercentage)?.let { fils ->
                AppText(text = stringResource(Res.string.policy_example, jodTextOfFils(fils)), style = AppTheme.typography.bodySmall, color = AppTheme.colors.accent)
            }
        }
        OptionRow(PaymentOption.FULL_ONLINE, Res.string.policy_full, Res.string.policy_full_sub, draft.options, onAction)
        if (PolicyField.OPTIONS in state.visibleErrors) Error(Res.string.policy_payment_error)
    }
}

@Composable
private fun OptionRow(option: PaymentOption, title: StringResource, subtitle: StringResource, selected: Set<PaymentOption>, onAction: (UiAction) -> Unit) {
    AppCard(modifier = Modifier.fillMaxWidth(), onClick = { onAction(UiAction.OnOption(option)) }) {
        Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(AppTheme.spacing.space8)) {
            AppCheckbox(checked = option in selected, onCheckedChange = { onAction(UiAction.OnOption(option)) })
            Column(modifier = Modifier.weight(1f)) {
                AppText(text = stringResource(title), style = AppTheme.typography.bodyLarge)
                AppText(text = stringResource(subtitle), style = AppTheme.typography.bodySmall, color = AppTheme.colors.muted)
            }
        }
    }
}

@Composable
internal fun Section(title: String, subtitle: String?, content: @Composable () -> Unit) {
    Column(verticalArrangement = Arrangement.spacedBy(AppTheme.spacing.space8)) {
        AppText(text = title, style = AppTheme.typography.titleSmall)
        subtitle?.let { AppText(text = it, style = AppTheme.typography.bodySmall, color = AppTheme.colors.muted) }
        content()
    }
}

@Composable
private fun Error(text: StringResource) {
    AppText(text = stringResource(text), style = AppTheme.typography.bodySmall, color = AppTheme.colors.danger)
}
