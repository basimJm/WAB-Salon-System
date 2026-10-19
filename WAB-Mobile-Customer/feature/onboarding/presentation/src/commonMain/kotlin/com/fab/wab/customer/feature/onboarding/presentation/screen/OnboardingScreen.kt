package com.fab.wab.customer.feature.onboarding.presentation.screen

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.verticalScroll
import androidx.compose.foundation.pager.HorizontalPager
import androidx.compose.foundation.pager.PagerState
import androidx.compose.foundation.pager.rememberPagerState
import androidx.compose.material3.Icon
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.runtime.rememberUpdatedState
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.style.TextAlign
import com.fab.wab.customer.core.analytics.compose.TrackScreen
import com.fab.wab.customer.designsystem.components.button.AppPrimaryButton
import com.fab.wab.customer.designsystem.components.button.AppTextButton
import com.fab.wab.customer.designsystem.components.layout.AppScreen
import com.fab.wab.customer.designsystem.components.pager.AppPageIndicator
import com.fab.wab.customer.designsystem.components.text.AppText
import com.fab.wab.customer.designsystem.theme.AppTheme
import com.fab.wab.customer.designsystem.theme.HeightClass
import com.fab.wab.customer.feature.onboarding.domain.model.OnboardingPage
import com.fab.wab.customer.feature.onboarding.presentation.analytics.OnboardingAnalytics
import com.fab.wab.customer.feature.onboarding.presentation.controller.contract.OnboardingContract.UiAction
import com.fab.wab.customer.feature.onboarding.presentation.controller.contract.OnboardingContract.UiState
import com.fab.wab.customer.feature.onboarding.presentation.resources.Res
import com.fab.wab.customer.feature.onboarding.presentation.resources.onboarding_next
import com.fab.wab.customer.feature.onboarding.presentation.resources.onboarding_skip
import com.fab.wab.customer.feature.onboarding.presentation.resources.onboarding_start
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.launch
import org.jetbrains.compose.resources.stringResource

/** Lets the route scroll the pager from a side effect without owning Compose state. */
class OnboardingPagerController internal constructor(
    private val pagerState: PagerState,
    private val scope: CoroutineScope,
) {
    val state: PagerState get() = pagerState

    fun scrollTo(index: Int) {
        scope.launch { pagerState.animateScrollToPage(index) }
    }
}

@Composable
fun rememberOnboardingPagerController(): OnboardingPagerController {
    val pagerState = rememberPagerState(pageCount = { OnboardingPage.count })
    val scope = rememberCoroutineScope()
    return remember(pagerState, scope) { OnboardingPagerController(pagerState, scope) }
}

/** S01: four swipeable pages, dots, Skip always visible, Next / Get started on the last page. */
@Composable
fun OnboardingScreen(
    state: UiState,
    onAction: (UiAction) -> Unit,
    modifier: Modifier = Modifier,
    pagerController: OnboardingPagerController = rememberOnboardingPagerController(),
) {
    TrackScreen(OnboardingAnalytics.SCREEN)
    val pagerState = pagerController.state
    val currentOnAction by rememberUpdatedState(onAction)
    LaunchedEffect(pagerState) {
        snapshotPages(pagerState) { currentOnAction(UiAction.OnPageShown(it)) }
    }
    val spacing = AppTheme.spacing
    AppScreen(modifier = modifier) { padding ->
        Column(Modifier.fillMaxSize().padding(padding)) {
            Row(Modifier.fillMaxWidth().padding(horizontal = spacing.space8), horizontalArrangement = Arrangement.End) {
                AppTextButton(text = stringResource(Res.string.onboarding_skip), onClick = { onAction(UiAction.OnSkipClicked) })
            }
            HorizontalPager(
                state = pagerState,
                modifier = Modifier.weight(1f).fillMaxWidth(),
                key = { OnboardingPage.entries[it].name },
            ) { index -> OnboardingPageContent(OnboardingPage.entries[index]) }
            Column(
                modifier = Modifier.fillMaxWidth().padding(horizontal = spacing.space24, vertical = spacing.space24),
                horizontalAlignment = Alignment.CenterHorizontally,
                verticalArrangement = Arrangement.spacedBy(spacing.space24),
            ) {
                AppPageIndicator(count = OnboardingPage.count, selected = state.pageIndex)
                val cta = if (state.isLastPage) Res.string.onboarding_start else Res.string.onboarding_next
                AppPrimaryButton(
                    text = stringResource(cta),
                    onClick = { onAction(UiAction.OnNextClicked) },
                    modifier = Modifier.fillMaxWidth(),
                )
            }
        }
    }
}

private suspend fun snapshotPages(pagerState: PagerState, onPage: (Int) -> Unit) {
    androidx.compose.runtime.snapshotFlow { pagerState.currentPage }.collect(onPage)
}

/** Portrait: illustration above the texts. Compact height (landscape phones): illustration beside the texts. */
@Composable
private fun OnboardingPageContent(page: OnboardingPage, modifier: Modifier = Modifier) {
    val visuals = page.visuals()
    val spacing = AppTheme.spacing
    val compactHeight = AppTheme.adaptive.window.heightClass == HeightClass.Compact
    val scroll = Modifier.verticalScroll(rememberScrollState()).padding(horizontal = spacing.space24)
    if (compactHeight) {
        Row(
            modifier = modifier.fillMaxSize().then(scroll),
            verticalAlignment = Alignment.CenterVertically,
            horizontalArrangement = Arrangement.spacedBy(spacing.space24, Alignment.CenterHorizontally),
        ) {
            Illustration(visuals, AppTheme.sizes.illustration)
            PageTexts(visuals, Modifier.weight(1f))
        }
    } else {
        Column(
            modifier = modifier.fillMaxSize().then(scroll),
            horizontalAlignment = Alignment.CenterHorizontally,
            verticalArrangement = Arrangement.spacedBy(spacing.space24, Alignment.CenterVertically),
        ) {
            Illustration(visuals, AppTheme.sizes.onboardingIllustration)
            PageTexts(visuals)
        }
    }
}

@Composable
private fun Illustration(visuals: OnboardingVisuals, size: androidx.compose.ui.unit.Dp, modifier: Modifier = Modifier) {
    val colors = AppTheme.colors
    Box(
        modifier = modifier.size(size).background(colors.soft, AppTheme.shapes.circle),
        contentAlignment = Alignment.Center,
    ) {
        Icon(
            imageVector = visuals.icon,
            contentDescription = stringResource(visuals.imageDescription),
            tint = colors.accent,
            modifier = Modifier.size(AppTheme.sizes.avatarLarge),
        )
    }
}

@Composable
private fun PageTexts(visuals: OnboardingVisuals, modifier: Modifier = Modifier) {
    Column(
        modifier = modifier,
        horizontalAlignment = Alignment.CenterHorizontally,
        verticalArrangement = Arrangement.spacedBy(AppTheme.spacing.space12),
    ) {
        AppText(text = stringResource(visuals.title), style = AppTheme.typography.headlineMedium, textAlign = TextAlign.Center)
        AppText(
            text = stringResource(visuals.text),
            style = AppTheme.typography.bodyLarge,
            color = AppTheme.colors.muted,
            textAlign = TextAlign.Center,
        )
    }
}
