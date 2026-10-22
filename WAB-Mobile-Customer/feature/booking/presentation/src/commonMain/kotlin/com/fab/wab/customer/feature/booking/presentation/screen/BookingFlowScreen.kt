package com.fab.wab.customer.feature.booking.presentation.screen

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import com.fab.wab.customer.core.analytics.compose.TrackScreen
import com.fab.wab.customer.designsystem.components.button.AppPrimaryButton
import com.fab.wab.customer.designsystem.components.feedback.AppStateContent
import com.fab.wab.customer.designsystem.components.feedback.contentStateOf
import com.fab.wab.customer.designsystem.components.layout.AppScreen
import com.fab.wab.customer.designsystem.components.text.AppText
import com.fab.wab.customer.designsystem.theme.AppTheme
import com.fab.wab.customer.feature.booking.domain.model.filsToJod
import com.fab.wab.customer.feature.booking.presentation.analytics.BookingAnalytics
import com.fab.wab.customer.feature.booking.presentation.controller.contract.BookingFlowContract.UiAction
import com.fab.wab.customer.feature.booking.presentation.controller.contract.BookingFlowContract.UiState
import com.fab.wab.customer.feature.booking.presentation.controller.contract.BookingStep
import com.fab.wab.customer.designsystem.resources.Res as CoreRes
import com.fab.wab.customer.designsystem.resources.price_jod
import com.fab.wab.customer.feature.booking.presentation.resources.Res
import com.fab.wab.customer.feature.booking.presentation.resources.booking_bride_badge
import com.fab.wab.customer.feature.booking.presentation.resources.booking_confirm
import com.fab.wab.customer.feature.booking.presentation.resources.booking_continue
import com.fab.wab.customer.feature.booking.presentation.resources.booking_step_companions
import com.fab.wab.customer.feature.booking.presentation.resources.booking_step_datetime
import com.fab.wab.customer.feature.booking.presentation.resources.booking_step_label
import com.fab.wab.customer.feature.booking.presentation.resources.booking_step_person
import com.fab.wab.customer.feature.booking.presentation.resources.booking_step_services
import com.fab.wab.customer.feature.booking.presentation.resources.booking_step_staff
import com.fab.wab.customer.feature.booking.presentation.resources.booking_step_summary
import com.fab.wab.customer.feature.booking.presentation.resources.booking_title
import org.jetbrains.compose.resources.stringResource

/**
 * S16 (`design/WAB 04 Booking Flow.dc.html`, `inFlow`): 52 dp header with title + salon name, six progress bars with
 * the step / person labels, the current step scrolling in `padding:4px 20px 20px`, and the sticky bottom bar.
 */
@Composable
fun BookingFlowScreen(state: UiState, onAction: (UiAction) -> Unit, modifier: Modifier = Modifier) {
    TrackScreen(BookingAnalytics.SCREEN)
    val spacing = AppTheme.spacing
    AppScreen(
        modifier = modifier,
        topBar = {
            BookingHeader(
                title = stringResource(Res.string.booking_title),
                subtitle = state.salon?.name.orEmpty(),
                onBack = { onAction(UiAction.OnBack) },
            )
        },
        bottomBar = { if (state.salon != null) StepBottomBar(state, onAction) },
    ) { padding ->
        Column(modifier = Modifier.fillMaxSize().padding(padding)) {
            if (state.salon != null) {
                BookingProgress(
                    current = state.step.ordinal,
                    stepLabel = stringResource(
                        Res.string.booking_step_label,
                        state.step.ordinal + 1,
                        BookingStep.entries.size,
                        stringResource(state.step.labelRes()),
                    ),
                    personLabel = if (state.step < BookingStep.COMPANIONS) {
                        joinDots(state.person.name, if (state.person.isBride) stringResource(Res.string.booking_bride_badge) else null)
                    } else {
                        ""
                    },
                    modifier = Modifier.padding(
                        start = spacing.space20,
                        top = spacing.space6,
                        end = spacing.space20,
                        bottom = spacing.space14,
                    ),
                )
            }
            if (state.error != null && !state.offline && state.salon == null) {
                ServicesErrorState(onRetry = { onAction(UiAction.OnRetry) })
                return@Column
            }
            AppStateContent(
                state = contentStateOf(state.loading, state.offline, state.error, isEmpty = false, hasContent = state.salon != null),
                onRetry = { onAction(UiAction.OnRetry) },
                modifier = Modifier.fillMaxSize(),
                loading = { ShimmerRows(BookingDesignConstants.serviceShimmerHeight, Modifier.padding(spacing.space20)) },
            ) {
                when (state.step) {
                    BookingStep.PERSON -> PersonStep(state, onAction)
                    BookingStep.SERVICES -> ServicesStep(state, onAction)
                    BookingStep.SLOT -> SlotStep(state, onAction)
                    BookingStep.STAFF -> StaffStep(state, onAction)
                    BookingStep.COMPANIONS -> CompanionsStep(state, onAction)
                    BookingStep.SUMMARY -> SummaryStep(state, onAction)
                }
            }
        }
    }
}

private fun BookingStep.labelRes() = when (this) {
    BookingStep.PERSON -> Res.string.booking_step_person
    BookingStep.SERVICES -> Res.string.booking_step_services
    BookingStep.SLOT -> Res.string.booking_step_datetime
    BookingStep.STAFF -> Res.string.booking_step_staff
    BookingStep.COMPANIONS -> Res.string.booking_step_companions
    BookingStep.SUMMARY -> Res.string.booking_step_summary
}

/**
 * Sticky bar: `padding:12px 20px 30px;border-top:1px solid var(--line);background:var(--card);gap:14px` with the
 * running totals (step 1 only: price `17px 700 accent`, duration `11.5px muted`) and the flex-1 54 dp button.
 */
@Composable
private fun StepBottomBar(state: UiState, onAction: (UiAction) -> Unit) {
    val spacing = AppTheme.spacing
    val summary = state.step == BookingStep.SUMMARY
    val enabled = when (state.step) {
        BookingStep.PERSON -> state.canContinuePerson
        BookingStep.SERVICES -> state.canContinueServices
        BookingStep.SLOT -> state.canContinueSlot
        BookingStep.STAFF -> state.canContinueStaff
        BookingStep.COMPANIONS -> true
        BookingStep.SUMMARY -> state.canConfirm
    }
    val action = when (state.step) {
        BookingStep.SUMMARY -> UiAction.OnConfirm
        BookingStep.COMPANIONS -> UiAction.OnJustMe
        else -> UiAction.OnContinue
    }
    BookingActionBar {
        Row(
            modifier = Modifier.fillMaxWidth(),
            horizontalArrangement = Arrangement.spacedBy(spacing.space14),
            verticalAlignment = Alignment.CenterVertically,
        ) {
            if (state.step == BookingStep.SERVICES) {
                Column {
                    AppText(
                        text = stringResource(CoreRes.string.price_jod, filsToJod(state.totals.priceFils)),
                        style = AppTheme.typography.titleLarge,
                        color = AppTheme.colors.accent,
                    )
                    AppText(
                        text = durationText(state.totals.durationMinutes),
                        style = AppTheme.typography.labelSmall,
                        color = AppTheme.colors.muted,
                    )
                }
            }
            AppPrimaryButton(
                text = stringResource(if (summary) Res.string.booking_confirm else Res.string.booking_continue),
                onClick = { onAction(action) },
                modifier = Modifier.weight(1f),
                enabled = enabled,
                loading = summary && state.draftLoading,
            )
        }
    }
}
