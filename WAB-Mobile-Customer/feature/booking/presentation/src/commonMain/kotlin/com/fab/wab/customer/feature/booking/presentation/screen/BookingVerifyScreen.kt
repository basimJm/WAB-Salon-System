package com.fab.wab.customer.feature.booking.presentation.screen

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.widthIn
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.verticalScroll
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.text.style.TextAlign
import com.fab.wab.customer.core.analytics.compose.TrackScreen
import com.fab.wab.customer.designsystem.components.button.AppPrimaryButton
import com.fab.wab.customer.designsystem.components.feedback.AppLoadingIndicator
import com.fab.wab.customer.designsystem.components.feedback.AppStateMessage
import com.fab.wab.customer.designsystem.components.layout.AppScreen
import com.fab.wab.customer.designsystem.components.text.AppText
import com.fab.wab.customer.designsystem.icons.AppIcons
import com.fab.wab.customer.designsystem.theme.AppTheme
import com.fab.wab.customer.feature.booking.domain.model.BookingDraft
import com.fab.wab.customer.feature.booking.presentation.analytics.BookingVerifyAnalytics
import com.fab.wab.customer.feature.booking.presentation.controller.contract.BookingVerifyContract.Phase
import com.fab.wab.customer.feature.booking.presentation.controller.contract.BookingVerifyContract.UiAction
import com.fab.wab.customer.feature.booking.presentation.controller.contract.BookingVerifyContract.UiState
import com.fab.wab.customer.feature.booking.presentation.resources.Res
import com.fab.wab.customer.feature.booking.presentation.resources.booking_pay_on_arrival
import com.fab.wab.customer.feature.booking.presentation.resources.verify_back_to_booking
import com.fab.wab.customer.feature.booking.presentation.resources.verify_cta
import com.fab.wab.customer.feature.booking.presentation.resources.verify_dont_close
import com.fab.wab.customer.feature.booking.presentation.resources.verify_error_title
import com.fab.wab.customer.feature.booking.presentation.resources.verify_expired_title
import com.fab.wab.customer.feature.booking.presentation.resources.verify_heading
import com.fab.wab.customer.feature.booking.presentation.resources.verify_hint
import com.fab.wab.customer.feature.booking.presentation.resources.verify_payment
import com.fab.wab.customer.feature.booking.presentation.resources.verify_people
import com.fab.wab.customer.feature.booking.presentation.resources.verify_processing
import com.fab.wab.customer.feature.booking.presentation.resources.verify_salon
import com.fab.wab.customer.feature.booking.presentation.resources.verify_title
import com.fab.wab.customer.feature.booking.presentation.resources.verify_total
import com.fab.wab.customer.feature.booking.presentation.resources.verify_when
import org.jetbrains.compose.resources.stringResource
import com.fab.wab.customer.designsystem.resources.Res as CoreRes
import com.fab.wab.customer.designsystem.resources.price_jod
import com.fab.wab.customer.designsystem.resources.state_retry

/** S16 step 6 (design `WAB 04` Step 6 presets): compact summary + "Verify with code", processing spinner, or an error. */
@Composable
fun BookingVerifyScreen(state: UiState, onAction: (UiAction) -> Unit, modifier: Modifier = Modifier) {
    TrackScreen(BookingVerifyAnalytics.SCREEN)
    AppScreen(
        modifier = modifier,
        topBar = {
            BookingHeader(
                title = stringResource(Res.string.verify_title),
                subtitle = state.draft?.salonName.orEmpty(),
                onBack = { onAction(UiAction.OnBackToBooking) },
            )
        },
    ) { padding ->
        Box(modifier = Modifier.fillMaxSize().padding(padding), contentAlignment = Alignment.Center) {
            when (state.phase) {
                Phase.LOADING -> AppLoadingIndicator()
                Phase.PROCESSING -> ProcessingContent()
                Phase.ERROR -> ErrorContent(state, onAction)
                Phase.READY -> state.draft?.let { ReadyContent(it, onAction) }
            }
        }
    }
}

@Composable
private fun ReadyContent(draft: BookingDraft, onAction: (UiAction) -> Unit) {
    val spacing = AppTheme.spacing
    Column(
        modifier = Modifier
            .fillMaxSize()
            .verticalScroll(rememberScrollState())
            .padding(horizontal = spacing.space20, vertical = spacing.space16),
        horizontalAlignment = Alignment.CenterHorizontally,
        verticalArrangement = Arrangement.spacedBy(spacing.space16),
    ) {
        Column(
            modifier = Modifier.fillMaxWidth().widthIn(max = AppTheme.sizes.sheetMaxWidth),
            verticalArrangement = Arrangement.spacedBy(spacing.space16),
        ) {
            AppText(text = stringResource(Res.string.verify_heading), style = AppTheme.typography.titleMedium)
            SummaryCard(draft)
            AppText(
                text = stringResource(Res.string.verify_hint),
                style = AppTheme.typography.bodySmall,
                color = AppTheme.colors.muted,
            )
            AppPrimaryButton(
                text = stringResource(Res.string.verify_cta),
                onClick = { onAction(UiAction.OnVerifyClick) },
                modifier = Modifier.fillMaxWidth(),
                leadingIcon = AppIcons.Lock,
            )
        }
    }
}

/** Design `rules`-style surface card: `padding:14px 16px;border-radius:16px;background:var(--surface)`. */
@Composable
private fun SummaryCard(draft: BookingDraft) {
    val spacing = AppTheme.spacing
    val first = draft.persons.minByOrNull { it.start }
    Column(
        modifier = Modifier
            .fillMaxWidth()
            .clip(AppTheme.shapes.large)
            .background(AppTheme.colors.surface)
            .padding(horizontal = spacing.space16, vertical = spacing.space14),
        verticalArrangement = Arrangement.spacedBy(spacing.space10),
    ) {
        SummaryRow(stringResource(Res.string.verify_salon), draft.salonName)
        SummaryRow(stringResource(Res.string.verify_when), whenText(dateIso = null, startIso = first?.start))
        SummaryRow(stringResource(Res.string.verify_people), draft.persons.size.toString())
        SummaryRow(stringResource(Res.string.verify_payment), stringResource(Res.string.booking_pay_on_arrival))
        SummaryRow(stringResource(Res.string.verify_total), stringResource(CoreRes.string.price_jod, draft.money.total), emphasized = true)
    }
}

@Composable
private fun SummaryRow(label: String, value: String, emphasized: Boolean = false) {
    Row(
        modifier = Modifier.fillMaxWidth(),
        horizontalArrangement = Arrangement.spacedBy(AppTheme.spacing.space12),
        verticalAlignment = Alignment.CenterVertically,
    ) {
        AppText(text = label, style = AppTheme.typography.bodyMedium, color = AppTheme.colors.muted)
        AppText(
            text = value,
            modifier = Modifier.weight(1f),
            style = if (emphasized) AppTheme.typography.titleMedium else AppTheme.typography.titleSmall,
            color = if (emphasized) AppTheme.colors.accent else AppTheme.colors.ink,
            textAlign = TextAlign.End,
        )
    }
}

/** Design `processing`: spinner, title and "don't close" hint. */
@Composable
private fun ProcessingContent() {
    val spacing = AppTheme.spacing
    Column(
        modifier = Modifier.padding(spacing.space24),
        horizontalAlignment = Alignment.CenterHorizontally,
        verticalArrangement = Arrangement.spacedBy(spacing.space12),
    ) {
        AppLoadingIndicator()
        AppText(
            text = stringResource(Res.string.verify_processing),
            style = AppTheme.typography.titleMedium,
            textAlign = TextAlign.Center,
        )
        AppText(
            text = stringResource(Res.string.verify_dont_close),
            style = AppTheme.typography.bodySmall,
            color = AppTheme.colors.muted,
            textAlign = TextAlign.Center,
        )
    }
}

@Composable
private fun ErrorContent(state: UiState, onAction: (UiAction) -> Unit) {
    AppStateMessage(
        icon = if (state.expired) AppIcons.Clock else AppIcons.Error,
        title = stringResource(if (state.expired) Res.string.verify_expired_title else Res.string.verify_error_title),
        message = state.errorMessage,
        actionText = stringResource(if (state.expired) Res.string.verify_back_to_booking else CoreRes.string.state_retry),
        onAction = { onAction(UiAction.OnRetry) },
    )
}
