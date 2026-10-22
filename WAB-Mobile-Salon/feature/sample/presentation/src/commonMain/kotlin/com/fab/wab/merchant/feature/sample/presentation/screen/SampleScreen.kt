package com.fab.wab.merchant.feature.sample.presentation.screen

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import com.fab.wab.merchant.core.analytics.compose.TrackScreen
import com.fab.wab.merchant.designsystem.components.card.AppCard
import com.fab.wab.merchant.designsystem.components.feedback.AppEmptyState
import com.fab.wab.merchant.designsystem.components.feedback.AppErrorState
import com.fab.wab.merchant.designsystem.components.layout.AppAdaptiveGrid
import com.fab.wab.merchant.designsystem.components.layout.AppPullToRefresh
import com.fab.wab.merchant.designsystem.components.layout.AppScreen
import com.fab.wab.merchant.designsystem.components.navigation.AppTopBar
import com.fab.wab.merchant.designsystem.components.shimmer.AppShimmerBox
import com.fab.wab.merchant.designsystem.components.text.AppText
import com.fab.wab.merchant.designsystem.theme.AppTheme
import com.fab.wab.merchant.feature.sample.domain.model.SampleItem
import com.fab.wab.merchant.feature.sample.presentation.analytics.SampleAnalytics
import com.fab.wab.merchant.feature.sample.presentation.controller.contract.SampleContract.UiAction
import com.fab.wab.merchant.feature.sample.presentation.controller.contract.SampleContract.UiState
import com.fab.wab.merchant.feature.sample.presentation.resources.Res
import com.fab.wab.merchant.feature.sample.presentation.resources.sample_empty
import com.fab.wab.merchant.feature.sample.presentation.resources.sample_title
import org.jetbrains.compose.resources.stringResource

private const val PLACEHOLDER_COUNT = 6

/** Reference screen: top bar, pull to refresh, shimmer loading, error, empty and an adaptive card grid. */
@Composable
fun SampleScreen(
    state: UiState,
    onEvent: (UiAction) -> Unit,
    modifier: Modifier = Modifier,
) {
    TrackScreen(SampleAnalytics.SCREEN)
    AppScreen(
        modifier = modifier,
        topBar = { AppTopBar(title = stringResource(Res.string.sample_title)) },
    ) {
        AppPullToRefresh(refreshing = false, onRefresh = { onEvent(UiAction.OnRefresh) }) {
            when {
                state.isLoading -> AppAdaptiveGrid(itemCount = PLACEHOLDER_COUNT, itemKey = { it }) {
                    AppShimmerBox(Modifier.fillMaxWidth().height(AppTheme.sizes.avatarLarge), AppTheme.shapes.medium)
                }

                state.errorMessage != null -> Box(Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
                    AppErrorState(onRetry = { onEvent(UiAction.OnRefresh) }, message = state.errorMessage)
                }

                state.isEmpty -> Box(Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
                    AppEmptyState(title = stringResource(Res.string.sample_empty))
                }

                else -> AppAdaptiveGrid(itemCount = state.items.size, itemKey = { state.items[it].id }) { index ->
                    SampleItemCard(item = state.items[index], onClick = { onEvent(UiAction.OnItemClicked(state.items[index].id)) })
                }
            }
        }
    }
}

@Composable
private fun SampleItemCard(item: SampleItem, onClick: () -> Unit) {
    AppCard(modifier = Modifier.fillMaxWidth(), onClick = onClick) {
        Column(verticalArrangement = Arrangement.spacedBy(AppTheme.spacing.space4)) {
            AppText(text = item.title, style = AppTheme.typography.titleMedium)
            AppText(text = item.description, style = AppTheme.typography.bodyMedium, color = AppTheme.colors.muted)
        }
    }
}
