package com.fab.wab.merchant.feature.finance.presentation.screen

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.ExperimentalLayoutApi
import androidx.compose.foundation.layout.FlowRow
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberUpdatedState
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.font.FontWeight
import com.fab.wab.merchant.core.analytics.compose.TrackScreen
import com.fab.wab.merchant.core.common.TimeFormat
import com.fab.wab.merchant.designsystem.components.button.AppButton
import com.fab.wab.merchant.designsystem.components.button.ButtonKind
import com.fab.wab.merchant.designsystem.components.card.AppCard
import com.fab.wab.merchant.designsystem.components.chip.AppFilterChip
import com.fab.wab.merchant.designsystem.components.feedback.AppEmptyState
import com.fab.wab.merchant.designsystem.components.feedback.AppErrorState
import com.fab.wab.merchant.designsystem.components.feedback.AppLoadingIndicator
import com.fab.wab.merchant.designsystem.components.format.jodText
import com.fab.wab.merchant.designsystem.components.layout.AppPullToRefresh
import com.fab.wab.merchant.designsystem.components.layout.AppScreen
import com.fab.wab.merchant.designsystem.components.navigation.AppTopBar
import com.fab.wab.merchant.designsystem.components.selector.AppSegmentedTabs
import com.fab.wab.merchant.designsystem.components.text.AppText
import com.fab.wab.merchant.designsystem.components.textfield.AppDatePickerDialog
import com.fab.wab.merchant.designsystem.icons.AppIcons
import com.fab.wab.merchant.designsystem.theme.AppTheme
import com.fab.wab.merchant.feature.finance.domain.FinanceRange
import com.fab.wab.merchant.feature.finance.domain.FinanceTab
import com.fab.wab.merchant.feature.finance.presentation.analytics.FinanceAnalytics
import com.fab.wab.merchant.feature.finance.presentation.controller.contract.FinanceContract.UiAction
import com.fab.wab.merchant.feature.finance.presentation.controller.contract.FinanceContract.UiState
import com.fab.wab.merchant.feature.finance.presentation.resources.Res
import com.fab.wab.merchant.feature.finance.presentation.resources.empty_body
import com.fab.wab.merchant.feature.finance.presentation.resources.empty_payouts
import com.fab.wab.merchant.feature.finance.presentation.resources.empty_refunds
import com.fab.wab.merchant.feature.finance.presentation.resources.empty_transactions
import com.fab.wab.merchant.feature.finance.presentation.resources.finance_bank
import com.fab.wab.merchant.feature.finance.presentation.resources.finance_info
import com.fab.wab.merchant.feature.finance.presentation.resources.finance_last_payout
import com.fab.wab.merchant.feature.finance.presentation.resources.finance_last_payout_amount
import com.fab.wab.merchant.feature.finance.presentation.resources.finance_no_payout
import com.fab.wab.merchant.feature.finance.presentation.resources.finance_pending
import com.fab.wab.merchant.feature.finance.presentation.resources.finance_title
import com.fab.wab.merchant.feature.finance.presentation.resources.range_custom
import com.fab.wab.merchant.feature.finance.presentation.resources.range_from
import com.fab.wab.merchant.feature.finance.presentation.resources.range_month
import com.fab.wab.merchant.feature.finance.presentation.resources.range_quarter
import com.fab.wab.merchant.feature.finance.presentation.resources.range_to
import com.fab.wab.merchant.feature.finance.presentation.resources.range_year
import com.fab.wab.merchant.feature.finance.presentation.resources.tab_payouts
import com.fab.wab.merchant.feature.finance.presentation.resources.tab_refunds
import com.fab.wab.merchant.feature.finance.presentation.resources.tab_transactions
import kotlinx.datetime.LocalDate
import org.jetbrains.compose.resources.stringResource

/** PRD M22 (design 08 `on.finance`). [bankReady] shows the bank-details entry once MER-045 ships. */
@Composable
fun FinanceScreen(state: UiState, bankReady: Boolean, onAction: (UiAction) -> Unit, onBack: () -> Unit, modifier: Modifier = Modifier) {
    TrackScreen(FinanceAnalytics.SCREEN_FINANCE)
    val currentOnAction by rememberUpdatedState(onAction)
    val spacing = AppTheme.spacing
    AppScreen(modifier = modifier, topBar = { AppTopBar(title = stringResource(Res.string.finance_title), onBack = onBack) }) { padding ->
        AppPullToRefresh(
            refreshing = state.refreshing,
            onRefresh = { onAction(UiAction.OnRefresh) },
            modifier = Modifier.padding(padding),
        ) {
            LazyColumn(contentPadding = PaddingValues(spacing.space16), verticalArrangement = Arrangement.spacedBy(spacing.space10)) {
                item(key = HEADER) { Header(state, bankReady, onAction) }
                when {
                    state.loading -> item(key = LOADING) {
                        Box(Modifier.fillMaxWidth(), contentAlignment = Alignment.Center) { AppLoadingIndicator() }
                    }
                    state.error != null -> item(key = ERROR) {
                        AppErrorState(onRetry = { onAction(UiAction.OnRetry) }, message = state.error)
                    }
                    state.isEmpty -> item(key = EMPTY) {
                        AppEmptyState(title = stringResource(emptyTitle(state.tab)), message = stringResource(Res.string.empty_body))
                    }
                    state.tab == FinanceTab.TRANSACTIONS -> items(
                        state.transactions,
                        key = { it.id },
                        contentType = { ROW_TRANSACTION },
                    ) { TransactionRow(it, onAction) }
                    state.tab == FinanceTab.REFUNDS -> items(
                        state.refunds,
                        key = { it.id },
                        contentType = { ROW_REFUND },
                    ) { RefundRow(it, onAction) }
                    else -> items(state.payouts, key = { it.id }, contentType = { ROW_PAYOUT }) { PayoutRow(it) }
                }
                if (state.hasMore && !state.loading) {
                    // The footer appearing at the end of the list asks for the next page (infinite scroll).
                    item(key = MORE) {
                        LaunchedEffect(
                            state.transactions.size,
                            state.refunds.size,
                            state.payouts.size,
                        ) { currentOnAction(UiAction.OnLoadMore) }
                        Box(Modifier.fillMaxWidth(), contentAlignment = Alignment.Center) { AppLoadingIndicator() }
                    }
                }
            }
        }
    }
}

private const val HEADER = "header"
private const val LOADING = "loading"
private const val ERROR = "error"
private const val EMPTY = "empty"
private const val MORE = "more"
private const val ROW_TRANSACTION = "transaction"
private const val ROW_REFUND = "refund"
private const val ROW_PAYOUT = "payout"

@Composable
private fun Header(state: UiState, bankReady: Boolean, onAction: (UiAction) -> Unit) {
    val spacing = AppTheme.spacing
    Column(verticalArrangement = Arrangement.spacedBy(spacing.space12)) {
        BalanceCard(state)
        AppText(text = stringResource(Res.string.finance_info), style = AppTheme.typography.bodySmall, color = AppTheme.colors.muted)
        if (bankReady && state.canManageBank) {
            AppButton(
                stringResource(Res.string.finance_bank),
                { onAction(UiAction.OnBank) },
                Modifier.fillMaxWidth(),
                kind = ButtonKind.Outlined,
                leadingIcon = AppIcons.Business,
            )
        }
        AppSegmentedTabs(
            tabs = listOf(
                stringResource(Res.string.tab_transactions),
                stringResource(Res.string.tab_refunds),
                stringResource(Res.string.tab_payouts),
            ),
            selectedIndex = state.tab.ordinal,
            onSelect = { onAction(UiAction.OnTab(FinanceTab.entries[it])) },
        )
        RangeFilter(state, onAction)
    }
}

@Composable
private fun BalanceCard(state: UiState) {
    val balance = state.balance
    AppCard(modifier = Modifier.fillMaxWidth()) {
        Column(verticalArrangement = Arrangement.spacedBy(AppTheme.spacing.space4)) {
            AppText(
                text = stringResource(Res.string.finance_pending),
                style = AppTheme.typography.labelLarge,
                color = AppTheme.colors.muted,
            )
            AppText(
                text = balance?.let { jodText(it.dueNow) }.orEmpty(),
                style = AppTheme.typography.headlineMedium.copy(fontWeight = FontWeight.Bold),
            )
            val last = balance?.lastPayoutNet
            val date = balance?.lastPayoutDate?.let { TimeFormat.isoDateText(it) }
            val text = when {
                last == null -> stringResource(Res.string.finance_no_payout)
                date == null -> stringResource(Res.string.finance_last_payout_amount, jodText(last))
                else -> stringResource(Res.string.finance_last_payout, jodText(last), date)
            }
            AppText(text = text, style = AppTheme.typography.bodySmall, color = AppTheme.colors.muted)
        }
    }
}

@OptIn(ExperimentalLayoutApi::class)
@Composable
private fun RangeFilter(state: UiState, onAction: (UiAction) -> Unit) {
    var picking by remember { mutableStateOf<Boolean?>(null) }
    val spacing = AppTheme.spacing
    Column(verticalArrangement = Arrangement.spacedBy(spacing.space8)) {
        FlowRow(horizontalArrangement = Arrangement.spacedBy(spacing.space8), verticalArrangement = Arrangement.spacedBy(spacing.space8)) {
            FinanceRange.entries.forEach { range ->
                AppFilterChip(stringResource(rangeLabel(range)), state.range == range, { onAction(UiAction.OnRange(range)) })
            }
        }
        if (state.range == FinanceRange.CUSTOM) {
            Row(horizontalArrangement = Arrangement.spacedBy(spacing.space10)) {
                DateChip(stringResource(Res.string.range_from), state.from, onClick = { picking = true }, modifier = Modifier.weight(1f))
                DateChip(stringResource(Res.string.range_to), state.to, onClick = { picking = false }, modifier = Modifier.weight(1f))
            }
        }
    }
    picking?.let { from ->
        AppDatePickerDialog(
            initialIsoDate = (if (from) state.from else state.to).toString(),
            onConfirm = { iso ->
                picking = null
                runCatching { LocalDate.parse(iso) }.getOrNull()?.let { onAction(if (from) UiAction.OnFrom(it) else UiAction.OnTo(it)) }
            },
            onDismiss = { picking = null },
        )
    }
}

@Composable
private fun DateChip(label: String, date: LocalDate, onClick: () -> Unit, modifier: Modifier = Modifier) {
    Column(modifier = modifier, verticalArrangement = Arrangement.spacedBy(AppTheme.spacing.space4)) {
        AppText(text = label, style = AppTheme.typography.labelMedium, color = AppTheme.colors.muted)
        AppButton(
            TimeFormat.isoDateText(date.toString()).orEmpty(),
            onClick,
            Modifier.fillMaxWidth(),
            kind = ButtonKind.Outlined,
            leadingIcon = AppIcons.Calendar,
        )
    }
}

private fun rangeLabel(range: FinanceRange) = when (range) {
    FinanceRange.THIS_MONTH -> Res.string.range_month
    FinanceRange.LAST_3_MONTHS -> Res.string.range_quarter
    FinanceRange.THIS_YEAR -> Res.string.range_year
    FinanceRange.CUSTOM -> Res.string.range_custom
}

private fun emptyTitle(tab: FinanceTab) = when (tab) {
    FinanceTab.TRANSACTIONS -> Res.string.empty_transactions
    FinanceTab.REFUNDS -> Res.string.empty_refunds
    FinanceTab.PAYOUTS -> Res.string.empty_payouts
}
