package com.fab.wab.customer.feature.bookings.presentation.screen

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.WindowInsets
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.navigationBars
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.statusBars
import androidx.compose.foundation.layout.windowInsetsPadding
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.verticalScroll
import androidx.compose.material3.Icon
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import com.fab.wab.customer.core.analytics.compose.TrackScreen
import com.fab.wab.customer.designsystem.components.button.AppIconButton
import com.fab.wab.customer.designsystem.components.button.AppSecondaryButton
import com.fab.wab.customer.designsystem.components.button.AppTextButton
import com.fab.wab.customer.designsystem.components.divider.AppDivider
import com.fab.wab.customer.designsystem.components.layout.AppScreen
import com.fab.wab.customer.designsystem.components.text.AppText
import com.fab.wab.customer.designsystem.icons.AppIcons
import com.fab.wab.customer.designsystem.resources.Res as CoreRes
import com.fab.wab.customer.designsystem.resources.common_close
import com.fab.wab.customer.designsystem.resources.state_retry
import com.fab.wab.customer.designsystem.theme.AppTheme
import com.fab.wab.customer.designsystem.utils.brandBackground
import com.fab.wab.customer.designsystem.utils.brandBrush
import com.fab.wab.customer.feature.bookings.domain.model.RatingStep
import com.fab.wab.customer.feature.bookings.presentation.analytics.BookingsAnalytics
import com.fab.wab.customer.feature.bookings.presentation.controller.contract.RatingContract.UiAction
import com.fab.wab.customer.feature.bookings.presentation.controller.contract.RatingContract.UiState
import com.fab.wab.customer.feature.bookings.presentation.resources.Res
import com.fab.wab.customer.feature.bookings.presentation.resources.rating_done_button
import com.fab.wab.customer.feature.bookings.presentation.resources.rating_done_none
import com.fab.wab.customer.feature.bookings.presentation.resources.rating_done_title
import com.fab.wab.customer.feature.bookings.presentation.resources.rating_next
import com.fab.wab.customer.feature.bookings.presentation.resources.rating_skip
import com.fab.wab.customer.feature.bookings.presentation.resources.rating_submit
import com.fab.wab.customer.feature.bookings.presentation.resources.rating_title
import org.jetbrains.compose.resources.stringResource

/** S18 (design `on.rate`): close + title + Skip bar; salon step, one step per staff member, success; sticky Next / Submit. */
@Composable
fun RatingScreen(state: UiState, onAction: (UiAction) -> Unit, onBack: () -> Unit, modifier: Modifier = Modifier) {
    TrackScreen(BookingsAnalytics.RATING_SCREEN)
    val showForm = !state.loading && state.error == null && !state.finished && state.step != null
    AppScreen(
        modifier = modifier,
        topBar = { RatingTopBar(showSkip = showForm && !state.submitting, onClose = onBack, onSkip = { onAction(UiAction.OnSkip) }) },
        bottomBar = { if (showForm) RatingActionBar(state, onAction) },
    ) { padding ->
        when {
            state.loading -> RatingShimmer(Modifier.padding(padding))
            state.error != null -> BookingsPlaceholder(
                icon = AppIcons.Error,
                title = state.error,
                modifier = Modifier.fillMaxSize().padding(padding).verticalScroll(rememberScrollState()),
                actionText = stringResource(CoreRes.string.state_retry),
                onAction = { onAction(UiAction.OnRetry) },
                spec = BookingsDesign.errorPlaceholder,
            )
            state.finished -> DoneContent(state.submittedCount, onFinish = { onAction(UiAction.OnDone) }, Modifier.padding(padding))
            else -> state.step?.let { step ->
                when (step) {
                    is RatingStep.Salon -> SalonStep(state, step, onAction, Modifier.padding(padding))
                    is RatingStep.Staff -> StaffStep(state, step, onAction, Modifier.padding(padding))
                }
            }
        }
    }
}

/** Design: 50 px bar, 44 px "✕" at the start, centred 16 px bold title, accent 14 px 600 "Skip" at the end while a step is shown. */
@Composable
private fun RatingTopBar(showSkip: Boolean, onClose: () -> Unit, onSkip: () -> Unit) {
    Box(
        modifier = Modifier
            .fillMaxWidth()
            .windowInsetsPadding(WindowInsets.statusBars)
            .height(AppTheme.sizes.topBarHeight)
            .padding(horizontal = AppTheme.spacing.space4),
    ) {
        AppIconButton(
            icon = AppIcons.Close,
            contentDescription = stringResource(CoreRes.string.common_close),
            onClick = onClose,
            modifier = Modifier.align(Alignment.CenterStart),
            size = BookingsDesign.closeButton,
        )
        AppText(
            text = stringResource(Res.string.rating_title),
            style = AppTheme.typography.titleMedium.copy(fontWeight = FontWeight.Bold),
            textAlign = TextAlign.Center,
            maxLines = 1,
            modifier = Modifier.align(Alignment.Center),
        )
        if (showSkip) {
            AppTextButton(text = stringResource(Res.string.rating_skip), onClick = onSkip, modifier = Modifier.align(Alignment.CenterEnd))
        }
    }
}

/** Design `rateForm` bar: `padding:12px 20px 30px;border-top:1px solid var(--line)`; 54 px gradient Next (salon) / Submit (last). */
@Composable
private fun RatingActionBar(state: UiState, onAction: (UiAction) -> Unit) {
    val spacing = AppTheme.spacing
    val isLast = state.stepIndex >= state.steps.lastIndex
    Column(modifier = Modifier.fillMaxWidth()) {
        AppDivider()
        GradientButton(
            text = stringResource(if (isLast) Res.string.rating_submit else Res.string.rating_next),
            onClick = { onAction(UiAction.OnSubmit) },
            modifier = Modifier
                .windowInsetsPadding(WindowInsets.navigationBars)
                .padding(start = spacing.space20, end = spacing.space20, top = spacing.space12, bottom = BookingsDesign.bottomBarPadding)
                .fillMaxWidth(),
            height = BookingsDesign.submitButtonHeight,
            fontSize = BookingsDesign.fontAction,
            enabled = state.canSubmit,
        )
    }
}

@Composable
private fun RatingShimmer(modifier: Modifier = Modifier) {
    val spacing = AppTheme.spacing
    Column(
        modifier = modifier.fillMaxSize().padding(vertical = spacing.space10),
        verticalArrangement = Arrangement.spacedBy(spacing.space12),
    ) {
        BookingsDesign.detailsShimmerHeights.forEach { BookingsShimmerCard(it) }
    }
}

/** Design `rateDone`: 84 px gradient circle with a white check, Playfair 20 px thanks line, soft "Back to booking" button. */
@Composable
private fun DoneContent(submittedCount: Int, onFinish: () -> Unit, modifier: Modifier = Modifier) {
    val spacing = AppTheme.spacing
    Column(
        modifier = modifier.fillMaxSize().verticalScroll(rememberScrollState()).padding(BookingsDesign.placeholderVerticalPadding),
        horizontalAlignment = Alignment.CenterHorizontally,
        verticalArrangement = Arrangement.Center,
    ) {
        Box(
            modifier = Modifier.size(BookingsDesign.doneCircle).brandBackground(brandBrush(), AppTheme.shapes.circle),
            contentAlignment = Alignment.Center,
        ) {
            Icon(
                imageVector = AppIcons.Check,
                contentDescription = null,
                tint = AppTheme.colors.onGradient,
                modifier = Modifier.size(BookingsDesign.doneIcon),
            )
        }
        AppText(
            text = stringResource(if (submittedCount > 0) Res.string.rating_done_title else Res.string.rating_done_none),
            style = AppTheme.typography.headlineSmall.copy(fontSize = BookingsDesign.fontHeading, fontWeight = FontWeight.Bold),
            textAlign = TextAlign.Center,
            modifier = Modifier.padding(top = spacing.space20, bottom = BookingsDesign.doneTitleBottomPadding),
        )
        AppSecondaryButton(text = stringResource(Res.string.rating_done_button), onClick = onFinish, modifier = Modifier.fillMaxWidth())
    }
}
