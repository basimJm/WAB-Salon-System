package com.fab.wab.customer.feature.bookings.presentation.screen

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.widthIn
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.verticalScroll
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.style.TextAlign
import com.fab.wab.customer.core.analytics.compose.TrackScreen
import com.fab.wab.customer.designsystem.components.button.AppOutlinedButton
import com.fab.wab.customer.designsystem.components.button.AppPrimaryButton
import com.fab.wab.customer.designsystem.components.card.AppCard
import com.fab.wab.customer.designsystem.components.feedback.AppStateMessage
import com.fab.wab.customer.designsystem.components.feedback.AppStateContent
import com.fab.wab.customer.designsystem.components.feedback.contentStateOf
import com.fab.wab.customer.designsystem.components.layout.AppScreen
import com.fab.wab.customer.designsystem.components.navigation.AppTopBar
import com.fab.wab.customer.designsystem.components.rating.AppRatingInput
import com.fab.wab.customer.designsystem.components.stepper.AppStepIndicator
import com.fab.wab.customer.designsystem.components.text.AppText
import com.fab.wab.customer.designsystem.components.textfield.AppTextField
import com.fab.wab.customer.designsystem.icons.AppIcons
import com.fab.wab.customer.designsystem.theme.AppTheme
import com.fab.wab.customer.feature.bookings.domain.model.RatingStep
import com.fab.wab.customer.feature.bookings.presentation.analytics.BookingsAnalytics
import com.fab.wab.customer.feature.bookings.presentation.controller.contract.RatingContract.UiAction
import com.fab.wab.customer.feature.bookings.presentation.controller.contract.RatingContract.UiState
import com.fab.wab.customer.feature.bookings.presentation.resources.Res
import com.fab.wab.customer.feature.bookings.presentation.resources.rating_salon_unknown
import com.fab.wab.customer.feature.bookings.presentation.resources.rating_comment_hint
import com.fab.wab.customer.feature.bookings.presentation.resources.rating_counter
import com.fab.wab.customer.feature.bookings.presentation.resources.rating_done_button
import com.fab.wab.customer.feature.bookings.presentation.resources.rating_done_message
import com.fab.wab.customer.feature.bookings.presentation.resources.rating_done_none
import com.fab.wab.customer.feature.bookings.presentation.resources.rating_done_title
import com.fab.wab.customer.feature.bookings.presentation.resources.rating_salon_step
import com.fab.wab.customer.feature.bookings.presentation.resources.rating_skip
import com.fab.wab.customer.feature.bookings.presentation.resources.rating_staff_step
import com.fab.wab.customer.feature.bookings.presentation.resources.rating_submit
import com.fab.wab.customer.feature.bookings.presentation.resources.rating_title
import com.fab.wab.customer.feature.salon.domain.model.ReviewDefaults
import org.jetbrains.compose.resources.stringResource

/** S18: one card per step (salon, then each staff member), Skip on every step, approval message at the end. */
@Composable
fun RatingScreen(state: UiState, onAction: (UiAction) -> Unit, onBack: () -> Unit, modifier: Modifier = Modifier) {
    TrackScreen(BookingsAnalytics.RATING_SCREEN)
    AppScreen(modifier = modifier, topBar = { AppTopBar(title = stringResource(Res.string.rating_title), onBack = onBack) }) { padding ->
        when {
            state.loading || state.error != null -> AppStateContent(
                state = contentStateOf(state.loading, isOffline = false, state.error, isEmpty = false, hasContent = false),
                onRetry = { onAction(UiAction.OnRetry) },
                modifier = Modifier.fillMaxSize().padding(padding),
            ) {}
            state.finished -> DoneContent(state.submittedCount, onDone = { onAction(UiAction.OnDone) }, Modifier.padding(padding))
            else -> state.step?.let { StepContent(state, it, onAction, Modifier.padding(padding)) }
        }
    }
}

@Composable
private fun StepContent(state: UiState, step: RatingStep, onAction: (UiAction) -> Unit, modifier: Modifier = Modifier) {
    val spacing = AppTheme.spacing
    Column(
        modifier = modifier.fillMaxSize().verticalScroll(rememberScrollState()).padding(spacing.space16),
        horizontalAlignment = Alignment.CenterHorizontally,
        verticalArrangement = Arrangement.spacedBy(spacing.space16),
    ) {
        AppStepIndicator(currentStep = state.stepIndex, stepCount = state.steps.size, modifier = Modifier.fillMaxWidth())
        val title = when (step) {
            is RatingStep.Salon -> stringResource(Res.string.rating_salon_step, step.salonName ?: stringResource(Res.string.rating_salon_unknown))
            is RatingStep.Staff -> stringResource(Res.string.rating_staff_step, step.memberName)
        }
        AppCard(modifier = Modifier.fillMaxWidth().widthIn(max = AppTheme.sizes.sheetMaxWidth)) {
            Column(verticalArrangement = Arrangement.spacedBy(spacing.space12), horizontalAlignment = Alignment.CenterHorizontally) {
                AppText(text = title, style = AppTheme.typography.titleMedium, textAlign = TextAlign.Center)
                AppRatingInput(value = state.rating, onValueChange = { onAction(UiAction.OnRatingChange(it)) })
                AppTextField(
                    value = state.comment,
                    onValueChange = { onAction(UiAction.OnCommentChange(it)) },
                    modifier = Modifier.fillMaxWidth(),
                    placeholder = stringResource(Res.string.rating_comment_hint),
                    singleLine = false,
                )
                AppText(
                    text = stringResource(Res.string.rating_counter, state.comment.length, ReviewDefaults.MAX_COMMENT_LENGTH),
                    color = AppTheme.colors.muted,
                    style = AppTheme.typography.bodySmall,
                    modifier = Modifier.fillMaxWidth(),
                )
                AppPrimaryButton(
                    text = stringResource(Res.string.rating_submit),
                    onClick = { onAction(UiAction.OnSubmit) },
                    modifier = Modifier.fillMaxWidth(),
                    enabled = state.canSubmit,
                    loading = state.submitting,
                )
                AppOutlinedButton(
                    text = stringResource(Res.string.rating_skip),
                    onClick = { onAction(UiAction.OnSkip) },
                    modifier = Modifier.fillMaxWidth(),
                    enabled = !state.submitting,
                )
            }
        }
    }
}

@Composable
private fun DoneContent(submittedCount: Int, onDone: () -> Unit, modifier: Modifier = Modifier) {
    AppStateMessage(
        icon = AppIcons.Check,
        title = stringResource(Res.string.rating_done_title),
        modifier = modifier.fillMaxSize(),
        message = stringResource(if (submittedCount > 0) Res.string.rating_done_message else Res.string.rating_done_none),
        actionText = stringResource(Res.string.rating_done_button),
        onAction = onDone,
    )
}
