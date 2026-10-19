package com.fab.wab.customer.feature.onboarding.presentation.screen

import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.defaultMinSize
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.pager.HorizontalPager
import androidx.compose.foundation.pager.PagerState
import androidx.compose.foundation.pager.rememberPagerState
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.runtime.rememberUpdatedState
import androidx.compose.runtime.snapshotFlow
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.semantics.Role
import androidx.compose.ui.text.font.FontWeight
import com.fab.wab.customer.core.analytics.compose.TrackScreen
import com.fab.wab.customer.designsystem.components.button.AppPrimaryButton
import com.fab.wab.customer.designsystem.components.layout.AppScreen
import com.fab.wab.customer.designsystem.components.text.AppText
import com.fab.wab.customer.designsystem.theme.AppTheme
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

/**
 * S01 as in `design/WAB 01 Auth.dc.html` (`on.onb`): hero gradient, `padding:54px 24px 34px`, Skip (accent 14/600)
 * at the end of a 44 dp row, the swipeable pages centered in the remaining height, then dots at the start and the
 * Next / Get started button at the end of the bottom row (margin-top 24).
 */
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
        snapshotFlow { pagerState.currentPage }.collect { currentOnAction(UiAction.OnPageShown(it)) }
    }
    AppScreen(modifier = modifier) {
        Column(
            Modifier
                .fillMaxSize()
                .background(onboardingHeroBrush())
                .padding(
                    start = OnboardingDesign.screenHorizontal,
                    end = OnboardingDesign.screenHorizontal,
                    top = OnboardingDesign.screenTop,
                    bottom = OnboardingDesign.screenBottom,
                ),
        ) {
            Row(
                Modifier.fillMaxWidth().defaultMinSize(minHeight = OnboardingDesign.topRowMinHeight),
                horizontalArrangement = Arrangement.End,
                verticalAlignment = Alignment.CenterVertically,
            ) {
                SkipButton(onClick = { onAction(UiAction.OnSkipClicked) })
            }
            HorizontalPager(
                state = pagerState,
                modifier = Modifier.weight(1f).fillMaxWidth(),
                key = { OnboardingPage.entries[it].name },
            ) { index -> OnboardingPageContent(OnboardingPage.entries[index]) }
            Row(
                modifier = Modifier.fillMaxWidth().padding(top = OnboardingDesign.bottomRowTop),
                verticalAlignment = Alignment.CenterVertically,
                horizontalArrangement = Arrangement.spacedBy(OnboardingDesign.bottomRowGap),
            ) {
                OnboardingDots(count = OnboardingPage.count, selected = state.pageIndex, modifier = Modifier.weight(1f))
                val cta = if (state.isLastPage) Res.string.onboarding_start else Res.string.onboarding_next
                AppPrimaryButton(
                    text = stringResource(cta),
                    onClick = { onAction(UiAction.OnNextClicked) },
                    modifier = Modifier.height(OnboardingDesign.ctaHeight),
                )
            }
        }
    }
}

/** `background:none;color:var(--accent);font-weight:600;font-size:14px;padding:10px 4px`, 48 dp tall target. */
@Composable
private fun SkipButton(onClick: () -> Unit, modifier: Modifier = Modifier) {
    AppText(
        text = stringResource(Res.string.onboarding_skip),
        modifier = modifier
            .defaultMinSize(minHeight = AppTheme.sizes.touchTarget)
            .clip(AppTheme.shapes.small)
            .clickable(role = Role.Button, onClick = onClick)
            .padding(vertical = OnboardingDesign.skipVerticalPadding, horizontal = OnboardingDesign.skipHorizontalPadding),
        style = AppTheme.typography.labelLarge.copy(fontSize = OnboardingDesign.skipSize, fontWeight = FontWeight.SemiBold),
        color = AppTheme.colors.accent,
    )
}

/** `onbDots`: 8 dp dots (gap 6), the active one 22 dp wide in the gradient's light violet, the others `--line`. */
@Composable
private fun OnboardingDots(count: Int, selected: Int, modifier: Modifier = Modifier) {
    val colors = AppTheme.colors
    val shape = RoundedCornerShape(OnboardingDesign.dotRadius)
    Row(modifier = modifier, horizontalArrangement = Arrangement.spacedBy(OnboardingDesign.dotGap)) {
        repeat(count) { index ->
            val active = index == selected
            Box(
                Modifier
                    .height(OnboardingDesign.dotSize)
                    .width(if (active) OnboardingDesign.dotActiveWidth else OnboardingDesign.dotSize)
                    .background(if (active) colors.gradientEnd else colors.line, shape),
            )
        }
    }
}
