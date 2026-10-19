package com.fab.wab.customer.feature.bookings.presentation.screen

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.verticalScroll
import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier
import com.fab.wab.customer.core.analytics.compose.TrackScreen
import com.fab.wab.customer.core.common.TimeFormat
import com.fab.wab.customer.core.domain.booking.BookingDetails
import com.fab.wab.customer.core.domain.booking.BookingStatus
import com.fab.wab.customer.designsystem.components.button.AppButton
import com.fab.wab.customer.designsystem.components.button.ButtonKind
import com.fab.wab.customer.designsystem.components.button.AppPrimaryButton
import com.fab.wab.customer.designsystem.components.dialog.AppDialog
import com.fab.wab.customer.designsystem.components.feedback.AppStateContent
import com.fab.wab.customer.designsystem.components.feedback.contentStateOf
import com.fab.wab.customer.designsystem.components.layout.AppPullToRefresh
import com.fab.wab.customer.designsystem.components.layout.AppScreen
import com.fab.wab.customer.designsystem.components.navigation.AppTopBar
import com.fab.wab.customer.designsystem.components.shimmer.AppShimmerList
import com.fab.wab.customer.designsystem.components.text.AppText
import com.fab.wab.customer.designsystem.resources.Res as CoreRes
import com.fab.wab.customer.designsystem.resources.time_am
import com.fab.wab.customer.designsystem.resources.time_pm
import com.fab.wab.customer.designsystem.theme.AppTheme
import com.fab.wab.customer.feature.bookings.domain.model.CancellationRule
import com.fab.wab.customer.feature.bookings.domain.model.RefundOutcome
import com.fab.wab.customer.feature.bookings.presentation.analytics.BookingsAnalytics
import com.fab.wab.customer.feature.bookings.presentation.controller.contract.BookingDetailsContract.UiAction
import com.fab.wab.customer.feature.bookings.presentation.controller.contract.BookingDetailsContract.UiState
import com.fab.wab.customer.feature.bookings.presentation.resources.Res
import com.fab.wab.customer.feature.bookings.presentation.resources.details_cancel
import com.fab.wab.customer.feature.bookings.presentation.resources.details_cancel_any_time
import com.fab.wab.customer.feature.bookings.presentation.resources.details_cancel_confirm
import com.fab.wab.customer.feature.bookings.presentation.resources.details_cancel_dismiss
import com.fab.wab.customer.feature.bookings.presentation.resources.details_cancel_title
import com.fab.wab.customer.feature.bookings.presentation.resources.details_cancel_until
import com.fab.wab.customer.feature.bookings.presentation.resources.details_cancel_window_passed
import com.fab.wab.customer.feature.bookings.presentation.resources.details_rate
import com.fab.wab.customer.feature.bookings.presentation.resources.details_refund_deposit_deducted
import com.fab.wab.customer.feature.bookings.presentation.resources.details_refund_deposit_kept
import com.fab.wab.customer.feature.bookings.presentation.resources.details_refund_full
import com.fab.wab.customer.feature.bookings.presentation.resources.details_refund_nothing
import com.fab.wab.customer.feature.bookings.presentation.resources.details_title
import org.jetbrains.compose.resources.stringResource

/** S15: status block, reasons, salon contact, persons, payment breakdown, policy, Rate, sticky Cancel + message. */
@Composable
fun BookingDetailsScreen(state: UiState, onAction: (UiAction) -> Unit, onBack: () -> Unit, modifier: Modifier = Modifier) {
    TrackScreen(BookingsAnalytics.DETAILS_SCREEN)
    val booking = state.booking
    AppScreen(
        modifier = modifier,
        topBar = { AppTopBar(title = stringResource(Res.string.details_title), onBack = onBack) },
        bottomBar = { if (booking != null) CancelBar(state, onAction) },
    ) { padding ->
        AppPullToRefresh(
            refreshing = state.refreshing,
            onRefresh = { onAction(UiAction.OnRefresh) },
            modifier = Modifier.fillMaxSize().padding(padding),
        ) {
            AppStateContent(
                state = contentStateOf(state.loading, state.offline, state.error, isEmpty = false, hasContent = booking != null),
                onRetry = { onAction(UiAction.OnRetry) },
                modifier = Modifier.fillMaxSize(),
                loading = { AppShimmerList(Modifier.padding(AppTheme.spacing.space16)) },
            ) {
                if (booking != null) DetailsBody(booking, state, onAction)
            }
        }
    }
    state.cancelDialog?.let { outcome ->
        AppDialog(
            title = stringResource(Res.string.details_cancel_title),
            confirmText = stringResource(Res.string.details_cancel_confirm),
            onConfirm = { onAction(UiAction.OnCancelConfirm) },
            onDismiss = { onAction(UiAction.OnCancelDismiss) },
            message = stringResource(outcome.messageRes()),
            dismissText = stringResource(Res.string.details_cancel_dismiss),
        )
    }
}

@Composable
private fun DetailsBody(booking: BookingDetails, state: UiState, onAction: (UiAction) -> Unit) {
    val spacing = AppTheme.spacing
    Column(
        modifier = Modifier.fillMaxSize().verticalScroll(rememberScrollState()).padding(spacing.space16),
        verticalArrangement = Arrangement.spacedBy(spacing.space16),
    ) {
        StatusBlock(booking)
        ReasonBlock(booking)
        SalonBlock(booking, state, onAction)
        PersonsBlock(booking)
        PaymentBlock(booking)
        PolicyBlock(booking)
        if (booking.status == BookingStatus.COMPLETED) {
            AppPrimaryButton(
                text = stringResource(Res.string.details_rate),
                onClick = { onAction(UiAction.OnRateClick) },
                modifier = Modifier.fillMaxWidth(),
            )
        }
    }
}

/** Sticky cancel bar with the fixed rule message above it (PRD S15 item 9). */
@Composable
private fun CancelBar(state: UiState, onAction: (UiAction) -> Unit) {
    val rule = state.cancellation
    if (rule is CancellationRule.NotApplicable) return
    val spacing = AppTheme.spacing
    Column(modifier = Modifier.fillMaxWidth().padding(spacing.space16), verticalArrangement = Arrangement.spacedBy(spacing.space8)) {
        AppText(text = rule.message(), style = AppTheme.typography.bodySmall, color = AppTheme.colors.muted)
        AppButton(
            text = stringResource(Res.string.details_cancel),
            onClick = { onAction(UiAction.OnCancelClick) },
            modifier = Modifier.fillMaxWidth(),
            kind = ButtonKind.Destructive,
            enabled = rule !is CancellationRule.WindowPassed && !state.cancelling,
            loading = state.cancelling,
        )
    }
}

@Composable
private fun CancellationRule.message(): String = when (this) {
    CancellationRule.AnyTime -> stringResource(Res.string.details_cancel_any_time)
    is CancellationRule.Until -> {
        val am = stringResource(CoreRes.string.time_am)
        val pm = stringResource(CoreRes.string.time_pm)
        val text = TimeFormat.instantText(deadline.toString(), am, pm)
        stringResource(Res.string.details_cancel_until, listOfNotNull(text?.date, text?.time).joinToString(DATE_TIME_SEPARATOR))
    }
    is CancellationRule.WindowPassed -> stringResource(Res.string.details_cancel_window_passed, windowHours.toInt())
    CancellationRule.NotApplicable -> ""
}

private fun RefundOutcome.messageRes() = when (this) {
    RefundOutcome.FULL_REFUND -> Res.string.details_refund_full
    RefundOutcome.DEPOSIT_KEPT -> Res.string.details_refund_deposit_kept
    RefundOutcome.DEPOSIT_DEDUCTED -> Res.string.details_refund_deposit_deducted
    RefundOutcome.NOTHING_PAID -> Res.string.details_refund_nothing
}

internal const val DATE_TIME_SEPARATOR = " "
