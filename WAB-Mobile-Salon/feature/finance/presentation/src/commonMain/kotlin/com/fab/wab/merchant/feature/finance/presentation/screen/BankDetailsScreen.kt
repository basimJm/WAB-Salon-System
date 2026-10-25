package com.fab.wab.merchant.feature.finance.presentation.screen

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.verticalScroll
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.style.TextDirection
import com.fab.wab.merchant.core.analytics.compose.TrackScreen
import com.fab.wab.merchant.designsystem.components.button.AppButton
import com.fab.wab.merchant.designsystem.components.card.AppCard
import com.fab.wab.merchant.designsystem.components.feedback.AppErrorState
import com.fab.wab.merchant.designsystem.components.feedback.AppLoadingIndicator
import com.fab.wab.merchant.designsystem.components.layout.AppScreen
import com.fab.wab.merchant.designsystem.components.navigation.AppTopBar
import com.fab.wab.merchant.designsystem.components.text.AppText
import com.fab.wab.merchant.designsystem.components.textfield.AppTextField
import com.fab.wab.merchant.designsystem.theme.AppTheme
import com.fab.wab.merchant.feature.finance.domain.BankField
import com.fab.wab.merchant.feature.finance.presentation.analytics.FinanceAnalytics
import com.fab.wab.merchant.feature.finance.presentation.controller.contract.BankDetailsContract.UiAction
import com.fab.wab.merchant.feature.finance.presentation.controller.contract.BankDetailsContract.UiState
import com.fab.wab.merchant.feature.finance.presentation.resources.Res
import com.fab.wab.merchant.feature.finance.presentation.resources.bank_continue
import com.fab.wab.merchant.feature.finance.presentation.resources.bank_current
import com.fab.wab.merchant.feature.finance.presentation.resources.bank_holder
import com.fab.wab.merchant.feature.finance.presentation.resources.bank_iban
import com.fab.wab.merchant.feature.finance.presentation.resources.bank_iban_error
import com.fab.wab.merchant.feature.finance.presentation.resources.bank_iban_hint
import com.fab.wab.merchant.feature.finance.presentation.resources.bank_name
import com.fab.wab.merchant.feature.finance.presentation.resources.bank_note
import com.fab.wab.merchant.feature.finance.presentation.resources.bank_required
import com.fab.wab.merchant.feature.finance.presentation.resources.bank_title
import org.jetbrains.compose.resources.stringResource

/** PRD M22 bank details (design 08 `on.bank`): bank name, holder, IBAN, then OTP to the owner's phone. */
@Composable
fun BankDetailsScreen(state: UiState, onAction: (UiAction) -> Unit, onBack: () -> Unit, modifier: Modifier = Modifier) {
    TrackScreen(FinanceAnalytics.SCREEN_BANK)
    val spacing = AppTheme.spacing
    val required = stringResource(Res.string.bank_required)
    AppScreen(
        modifier = modifier,
        topBar = { AppTopBar(title = stringResource(Res.string.bank_title), onBack = onBack) },
        bottomBar = {
            if (!state.loading && state.error == null) {
                AppButton(
                    text = stringResource(Res.string.bank_continue),
                    onClick = { onAction(UiAction.OnContinue) },
                    modifier = Modifier.fillMaxWidth().padding(horizontal = spacing.space16, vertical = spacing.space10),
                    loading = state.working,
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
                AppCard(modifier = Modifier.fillMaxWidth()) {
                    AppText(
                        text = stringResource(Res.string.bank_note),
                        style = AppTheme.typography.bodySmall,
                        color = AppTheme.colors.muted,
                    )
                }
                state.saved?.let {
                    AppText(text = stringResource(Res.string.bank_current, it.ibanLast4), style = AppTheme.typography.labelLarge)
                }
                AppTextField(
                    value = state.draft.bankName,
                    onValueChange = { onAction(UiAction.OnBankName(it)) },
                    label = stringResource(Res.string.bank_name),
                    error = if (BankField.BANK_NAME in state.visibleErrors) required else null,
                )
                AppTextField(
                    value = state.draft.accountHolder,
                    onValueChange = { onAction(UiAction.OnHolder(it)) },
                    label = stringResource(Res.string.bank_holder),
                    error = if (BankField.HOLDER in state.visibleErrors) required else null,
                )
                AppTextField(
                    value = state.draft.iban,
                    onValueChange = { onAction(UiAction.OnIban(it)) },
                    label = stringResource(Res.string.bank_iban),
                    placeholder = stringResource(Res.string.bank_iban_hint),
                    textDirection = TextDirection.Ltr,
                    error = if (BankField.IBAN in state.visibleErrors) stringResource(Res.string.bank_iban_error) else null,
                )
            }
        }
    }
}
