package com.fab.wab.customer.feature.booking.presentation.screen

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
import com.fab.wab.customer.core.analytics.compose.TrackScreen
import com.fab.wab.customer.designsystem.components.button.AppPrimaryButton
import com.fab.wab.customer.designsystem.components.control.AppSwitch
import com.fab.wab.customer.designsystem.components.feedback.AppEmptyState
import com.fab.wab.customer.designsystem.components.feedback.AppStateContent
import com.fab.wab.customer.designsystem.components.feedback.contentStateOf
import com.fab.wab.customer.designsystem.components.layout.AppScreen
import com.fab.wab.customer.designsystem.components.navigation.AppTopBar
import com.fab.wab.customer.designsystem.components.shimmer.AppShimmerList
import com.fab.wab.customer.designsystem.components.stepper.AppStepIndicator
import com.fab.wab.customer.designsystem.components.text.AppText
import com.fab.wab.customer.designsystem.components.textfield.AppTextField
import com.fab.wab.customer.designsystem.theme.AppTheme
import com.fab.wab.customer.feature.booking.presentation.analytics.BookingAnalytics
import com.fab.wab.customer.feature.booking.presentation.controller.contract.BookingFlowContract.UiAction
import com.fab.wab.customer.feature.booking.presentation.controller.contract.BookingFlowContract.UiState
import com.fab.wab.customer.feature.booking.presentation.controller.contract.BookingStep
import com.fab.wab.customer.feature.booking.presentation.resources.Res
import com.fab.wab.customer.feature.booking.presentation.resources.booking_bride_toggle
import com.fab.wab.customer.feature.booking.presentation.resources.booking_continue
import com.fab.wab.customer.feature.booking.presentation.resources.booking_name_error
import com.fab.wab.customer.feature.booking.presentation.resources.booking_name_label
import com.fab.wab.customer.feature.booking.presentation.resources.booking_step_coming
import com.fab.wab.customer.feature.booking.presentation.resources.booking_step_person_title
import com.fab.wab.customer.feature.booking.presentation.resources.booking_title
import org.jetbrains.compose.resources.stringResource

/** S16: step indicator + the current step; Back goes to the previous step with selections kept. */
@Composable
fun BookingFlowScreen(state: UiState, onAction: (UiAction) -> Unit, modifier: Modifier = Modifier) {
    TrackScreen(BookingAnalytics.SCREEN)
    val spacing = AppTheme.spacing
    AppScreen(
        modifier = modifier,
        topBar = { AppTopBar(title = stringResource(Res.string.booking_title), onBack = { onAction(UiAction.OnBack) }) },
        bottomBar = { if (state.salon != null) StepBottomBar(state, onAction) },
    ) { padding ->
        Column(modifier = Modifier.fillMaxSize().padding(padding)) {
            AppStepIndicator(
                currentStep = state.step.ordinal,
                stepCount = BookingStep.entries.size,
                modifier = Modifier.padding(horizontal = spacing.space16, vertical = spacing.space12),
            )
            AppStateContent(
                state = contentStateOf(state.loading, state.offline, state.error, isEmpty = false, hasContent = state.salon != null),
                onRetry = { onAction(UiAction.OnRetry) },
                modifier = Modifier.fillMaxSize(),
                loading = { AppShimmerList(Modifier.padding(spacing.space16)) },
            ) {
                when (state.step) {
                    BookingStep.PERSON -> PersonStep(state, onAction)
                    BookingStep.SERVICES -> ServicesStep(state, onAction)
                    else -> AppEmptyState(title = stringResource(Res.string.booking_step_coming))
                }
            }
        }
    }
}

/** Step 0 (PRD S16): editable name (account name prefilled) + bride toggle for women's salons only. */
@Composable
private fun PersonStep(state: UiState, onAction: (UiAction) -> Unit) {
    val spacing = AppTheme.spacing
    Column(
        modifier = Modifier.fillMaxSize().verticalScroll(rememberScrollState()).padding(spacing.space16),
        verticalArrangement = Arrangement.spacedBy(spacing.space16),
    ) {
        AppText(text = stringResource(Res.string.booking_step_person_title), style = AppTheme.typography.headlineSmall)
        AppTextField(
            value = state.person.name,
            onValueChange = { onAction(UiAction.OnNameChange(it)) },
            modifier = Modifier.fillMaxWidth(),
            label = stringResource(Res.string.booking_name_label),
            error = if (state.nameError) stringResource(Res.string.booking_name_error) else null,
        )
        if (state.isWomenSalon) {
            Row(modifier = Modifier.fillMaxWidth(), verticalAlignment = Alignment.CenterVertically) {
                AppText(text = stringResource(Res.string.booking_bride_toggle), modifier = Modifier.weight(1f))
                AppSwitch(checked = state.person.isBride, onCheckedChange = { onAction(UiAction.OnBrideChange(it)) })
            }
        }
    }
}

@Composable
private fun StepBottomBar(state: UiState, onAction: (UiAction) -> Unit) {
    val spacing = AppTheme.spacing
    Column(modifier = Modifier.fillMaxWidth().padding(spacing.space16), verticalArrangement = Arrangement.spacedBy(spacing.space8)) {
        if (state.step == BookingStep.SERVICES) ServicesTotals(state)
        val enabled = when (state.step) {
            BookingStep.PERSON -> state.canContinuePerson
            BookingStep.SERVICES -> state.canContinueServices
            else -> false
        }
        AppPrimaryButton(
            text = stringResource(Res.string.booking_continue),
            onClick = { onAction(UiAction.OnContinue) },
            modifier = Modifier.fillMaxWidth(),
            enabled = enabled,
        )
    }
}
