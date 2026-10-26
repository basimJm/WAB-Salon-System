package com.fab.wab.customer.feature.bookings.presentation.screen

import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.WindowInsets
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.navigationBars
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.windowInsetsPadding
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.verticalScroll
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.semantics.Role
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import com.fab.wab.customer.core.analytics.compose.TrackScreen
import com.fab.wab.customer.core.common.TimeFormat
import com.fab.wab.customer.core.domain.booking.BookingDetails
import com.fab.wab.customer.core.domain.booking.BookingStatus
import com.fab.wab.customer.designsystem.components.divider.AppDivider
import com.fab.wab.customer.designsystem.components.layout.AppPullToRefresh
import com.fab.wab.customer.designsystem.components.layout.AppScreen
import com.fab.wab.customer.designsystem.components.navigation.AppTopBar
import com.fab.wab.customer.designsystem.components.text.AppText
import com.fab.wab.customer.designsystem.icons.AppIcons
import com.fab.wab.customer.designsystem.resources.Res as CoreRes
import com.fab.wab.customer.designsystem.resources.state_retry
import com.fab.wab.customer.designsystem.resources.time_am
import com.fab.wab.customer.designsystem.resources.time_pm
import com.fab.wab.customer.designsystem.theme.AppTheme
import com.fab.wab.customer.feature.bookings.domain.model.CancellationRule
import com.fab.wab.customer.feature.bookings.presentation.analytics.BookingsAnalytics
import com.fab.wab.customer.feature.bookings.presentation.controller.contract.BookingDetailsContract.UiAction
import com.fab.wab.customer.feature.bookings.presentation.controller.contract.BookingDetailsContract.UiState
import com.fab.wab.customer.feature.bookings.presentation.resources.Res
import com.fab.wab.customer.feature.bookings.presentation.resources.details_cancel_window_passed
import com.fab.wab.customer.feature.bookings.presentation.resources.bookings_error_network
import com.fab.wab.customer.feature.bookings.presentation.resources.bookings_error_server
import com.fab.wab.customer.feature.bookings.presentation.resources.details_cancel
import com.fab.wab.customer.feature.bookings.presentation.resources.details_cancel_any_time
import com.fab.wab.customer.feature.bookings.presentation.resources.details_cancel_until
import com.fab.wab.customer.feature.bookings.presentation.resources.details_persons
import com.fab.wab.customer.feature.bookings.presentation.resources.details_rate
import com.fab.wab.customer.feature.bookings.presentation.resources.details_title
import org.jetbrains.compose.resources.pluralStringResource
import org.jetbrains.compose.resources.stringResource

/** S15 (design `on.details`): top bar, shimmer / error placeholder, scrolling blocks, sticky cancel bar, cancel dialog. */
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
            when {
                state.loading -> DetailsShimmer()
                booking != null -> DetailsBody(booking, state, onAction)
                else -> BookingsPlaceholder(
                    icon = if (state.offline) AppIcons.Offline else AppIcons.Error,
                    title = when {
                        state.offline -> stringResource(Res.string.bookings_error_network)
                        else -> state.error ?: stringResource(Res.string.bookings_error_server)
                    },
                    modifier = Modifier.fillMaxSize().verticalScroll(rememberScrollState()),
                    actionText = stringResource(CoreRes.string.state_retry),
                    onAction = { onAction(UiAction.OnRetry) },
                    spec = BookingsDesign.errorPlaceholder,
                )
            }
        }
    }
    state.cancelDialog?.let { outcome ->
        CancelBookingDialog(
            outcome = outcome,
            onConfirm = { onAction(UiAction.OnCancelConfirm) },
            onDismiss = { onAction(UiAction.OnCancelDismiss) },
        )
    }
}

/** Design `dLoading`: four 18 px-radius shimmer blocks (120 / 80 / 150 / 110) with a 12 px gap. */
@Composable
private fun DetailsShimmer() {
    val spacing = AppTheme.spacing
    Column(
        modifier = Modifier.fillMaxSize().padding(vertical = spacing.space6),
        verticalArrangement = Arrangement.spacedBy(spacing.space12),
    ) {
        BookingsDesign.detailsShimmerHeights.forEach { BookingsShimmerCard(it) }
    }
}

@Composable
private fun DetailsBody(booking: BookingDetails, state: UiState, onAction: (UiAction) -> Unit) {
    val spacing = AppTheme.spacing
    Column(
        modifier = Modifier.fillMaxSize().verticalScroll(rememberScrollState()).padding(top = spacing.space4, bottom = spacing.space20),
        verticalArrangement = Arrangement.spacedBy(spacing.space12),
    ) {
        StatusBlock(booking)
        ReasonBlock(booking)
        SalonBlock(booking, state, onAction)
        AppText(
            text = stringResource(Res.string.details_persons),
            style = AppTheme.typography.titleSmall.copy(fontSize = BookingsDesign.fontAction, fontWeight = FontWeight.Bold),
            modifier = Modifier.padding(top = spacing.space4),
        )
        booking.persons.forEach { PersonCard(it) }
        PaymentBlock(booking)
        PolicyBlock(booking)
        if (booking.status == BookingStatus.COMPLETED) {
            GradientButton(
                text = stringResource(Res.string.details_rate),
                onClick = { onAction(UiAction.OnRateClick) },
                modifier = Modifier.fillMaxWidth(),
                height = BookingsDesign.rateButtonHeight,
                fontSize = BookingsDesign.fontAction,
                leadingIcon = AppIcons.Star,
            )
        }
    }
}

/**
 * Design `b.showCancel`: `padding:12px 20px 30px;border-top:1px solid var(--line);background:var(--card)`; centred 12.5 px rule
 * message (muted, or rose 600 when locked); 52 px button with a rose border + 6 % rose fill, or a line border on the surface
 * with faint text when cancellation is no longer allowed.
 */
@Composable
private fun CancelBar(state: UiState, onAction: (UiAction) -> Unit) {
    val rule = state.cancellation
    if (rule is CancellationRule.NotApplicable) return
    val colors = AppTheme.colors
    val spacing = AppTheme.spacing
    val canCancel = rule !is CancellationRule.WindowPassed
    val shape = AppTheme.shapes.medium
    Column(modifier = Modifier.fillMaxWidth().background(colors.card)) {
        AppDivider()
        Column(
            modifier = Modifier
                .windowInsetsPadding(WindowInsets.navigationBars)
                .padding(start = spacing.space20, end = spacing.space20, top = spacing.space12, bottom = BookingsDesign.bottomBarPadding),
        ) {
            AppText(
                text = rule.message(),
                style = AppTheme.typography.bodySmall.copy(
                    fontSize = BookingsDesign.fontCaption,
                    lineHeight = BookingsDesign.lineHeightBody,
                    fontWeight = if (canCancel) FontWeight.Normal else FontWeight.SemiBold,
                ),
                color = if (canCancel) colors.muted else colors.danger,
                textAlign = TextAlign.Center,
                modifier = Modifier.fillMaxWidth().padding(bottom = spacing.space10),
            )
            Box(
                modifier = Modifier
                    .fillMaxWidth()
                    .height(BookingsDesign.cancelButtonHeight)
                    .background(if (canCancel) colors.dangerContainer else colors.surface, shape)
                    .border(AppTheme.sizes.borderWidth, if (canCancel) colors.danger else colors.line, shape)
                    .clickable(enabled = canCancel && !state.cancelling, role = Role.Button) { onAction(UiAction.OnCancelClick) },
                contentAlignment = Alignment.Center,
            ) {
                if (state.cancelling) {
                    CircularProgressIndicator(
                        modifier = Modifier.height(AppTheme.sizes.spinner),
                        color = colors.danger,
                        strokeWidth = AppTheme.sizes.spinnerStroke,
                    )
                } else {
                    AppText(
                        text = stringResource(Res.string.details_cancel),
                        style = AppTheme.typography.labelLarge,
                        color = if (canCancel) colors.danger else colors.faint,
                        maxLines = 1,
                    )
                }
            }
        }
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
    is CancellationRule.WindowPassed -> windowHours.toInt().let { hours ->
        pluralStringResource(Res.plurals.details_cancel_window_passed, hours, hours)
    }
    CancellationRule.NotApplicable -> ""
}

internal const val DATE_TIME_SEPARATOR = ", "
