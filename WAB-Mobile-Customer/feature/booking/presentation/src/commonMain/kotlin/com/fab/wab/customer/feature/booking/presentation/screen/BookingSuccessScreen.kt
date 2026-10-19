package com.fab.wab.customer.feature.booking.presentation.screen

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.widthIn
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.verticalScroll
import androidx.compose.material3.Icon
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.style.TextAlign
import com.fab.wab.customer.core.analytics.compose.TrackScreen
import com.fab.wab.customer.designsystem.components.button.AppOutlinedButton
import com.fab.wab.customer.designsystem.components.button.AppPrimaryButton
import com.fab.wab.customer.designsystem.components.button.AppTextButton
import com.fab.wab.customer.designsystem.components.card.AppCard
import com.fab.wab.customer.designsystem.components.layout.AppScreen
import com.fab.wab.customer.designsystem.components.text.AppText
import com.fab.wab.customer.designsystem.icons.AppIcons
import com.fab.wab.customer.designsystem.theme.AppTheme
import com.fab.wab.customer.feature.booking.presentation.analytics.BookingSuccessAnalytics
import com.fab.wab.customer.feature.booking.presentation.controller.contract.BookingSuccessContract.UiAction
import com.fab.wab.customer.feature.booking.presentation.controller.contract.BookingSuccessContract.UiState
import com.fab.wab.customer.feature.booking.presentation.resources.Res
import com.fab.wab.customer.feature.booking.presentation.resources.success_back_home
import com.fab.wab.customer.feature.booking.presentation.resources.success_copy
import com.fab.wab.customer.feature.booking.presentation.resources.success_message
import com.fab.wab.customer.feature.booking.presentation.resources.success_reference
import com.fab.wab.customer.feature.booking.presentation.resources.success_title
import com.fab.wab.customer.feature.booking.presentation.resources.success_view_booking
import org.jetbrains.compose.resources.stringResource

/** S17: success icon + message, reference card with Copy, View booking (S15) and Back to Home. No calendar export (PRD). */
@Composable
fun BookingSuccessScreen(state: UiState, onAction: (UiAction) -> Unit, modifier: Modifier = Modifier) {
    TrackScreen(BookingSuccessAnalytics.SCREEN)
    val spacing = AppTheme.spacing
    AppScreen(modifier = modifier) { padding ->
        Column(
            modifier = Modifier.fillMaxSize().padding(padding).verticalScroll(rememberScrollState()).padding(spacing.space16),
            horizontalAlignment = Alignment.CenterHorizontally,
            verticalArrangement = Arrangement.spacedBy(spacing.space16, Alignment.CenterVertically),
        ) {
            Icon(
                AppIcons.Check,
                contentDescription = null,
                tint = AppTheme.colors.success,
                modifier = Modifier.size(AppTheme.sizes.stateIcon),
            )
            AppText(
                text = stringResource(Res.string.success_title),
                style = AppTheme.typography.headlineSmall,
                textAlign = TextAlign.Center,
            )
            AppText(
                text = stringResource(Res.string.success_message),
                style = AppTheme.typography.bodyMedium,
                color = AppTheme.colors.muted,
                textAlign = TextAlign.Center,
            )
            ReferenceCard(
                state.referenceNumber,
                onCopy = { onAction(UiAction.OnCopyReference) },
                Modifier.widthIn(max = AppTheme.sizes.sheetMaxWidth),
            )
            Column(
                modifier = Modifier.fillMaxWidth().widthIn(max = AppTheme.sizes.sheetMaxWidth),
                verticalArrangement = Arrangement.spacedBy(spacing.space8),
            ) {
                AppPrimaryButton(
                    text = stringResource(Res.string.success_view_booking),
                    onClick = { onAction(UiAction.OnViewBooking) },
                    modifier = Modifier.fillMaxWidth(),
                )
                AppOutlinedButton(
                    text = stringResource(Res.string.success_back_home),
                    onClick = { onAction(UiAction.OnBackHome) },
                    modifier = Modifier.fillMaxWidth(),
                )
            }
        }
    }
}

@Composable
private fun ReferenceCard(referenceNumber: String, onCopy: () -> Unit, modifier: Modifier = Modifier) {
    AppCard(modifier = modifier.fillMaxWidth()) {
        Row(modifier = Modifier.fillMaxWidth(), verticalAlignment = Alignment.CenterVertically) {
            Column(modifier = Modifier.weight(1f)) {
                AppText(
                    text = stringResource(Res.string.success_reference),
                    style = AppTheme.typography.labelMedium,
                    color = AppTheme.colors.muted,
                )
                AppText(text = referenceNumber, style = AppTheme.typography.titleLarge)
            }
            AppTextButton(text = stringResource(Res.string.success_copy), onClick = onCopy)
        }
    }
}
