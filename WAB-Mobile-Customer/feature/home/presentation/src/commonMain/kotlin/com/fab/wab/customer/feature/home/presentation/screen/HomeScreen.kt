package com.fab.wab.customer.feature.home.presentation.screen

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.verticalScroll
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import com.fab.wab.customer.core.analytics.compose.TrackScreen
import com.fab.wab.customer.core.domain.session.Gender
import com.fab.wab.customer.designsystem.components.badge.AppCountBadge
import com.fab.wab.customer.designsystem.components.button.AppIconButton
import com.fab.wab.customer.designsystem.components.dialog.AppGlobalDialog
import com.fab.wab.customer.designsystem.components.dialog.GlobalDialogKind
import com.fab.wab.customer.designsystem.components.feedback.AppStateContent
import com.fab.wab.customer.designsystem.components.feedback.contentStateOf
import com.fab.wab.customer.designsystem.components.layout.AppPullToRefresh
import com.fab.wab.customer.designsystem.components.layout.AppScreen
import com.fab.wab.customer.designsystem.components.media.AppBannerCarousel
import com.fab.wab.customer.designsystem.components.selector.AppSegmentedTabs
import com.fab.wab.customer.designsystem.components.shimmer.AppShimmerLine
import com.fab.wab.customer.designsystem.components.shimmer.AppShimmerSection
import com.fab.wab.customer.designsystem.components.text.AppText
import com.fab.wab.customer.designsystem.components.textfield.AppSearchBarStatic
import com.fab.wab.customer.designsystem.icons.AppIcons
import com.fab.wab.customer.designsystem.theme.AppTheme
import com.fab.wab.customer.feature.home.presentation.analytics.HomeAnalytics
import com.fab.wab.customer.feature.home.presentation.controller.contract.HomeContract.HomeDialog
import com.fab.wab.customer.feature.home.presentation.controller.contract.HomeContract.UiAction
import com.fab.wab.customer.feature.home.presentation.controller.contract.HomeContract.UiState
import com.fab.wab.customer.feature.home.presentation.resources.Res
import com.fab.wab.customer.feature.home.presentation.resources.home_notifications
import com.fab.wab.customer.feature.home.presentation.resources.home_search_hint
import com.fab.wab.customer.feature.home.presentation.resources.home_tab_men
import com.fab.wab.customer.feature.home.presentation.resources.home_tab_women
import com.fab.wab.customer.feature.home.presentation.resources.home_welcome
import org.jetbrains.compose.resources.stringResource

/** S03: welcome row → banners → static search bar → gender tabs → services / recommended / nearest. */
@Composable
fun HomeScreen(state: UiState, onAction: (UiAction) -> Unit, modifier: Modifier = Modifier) {
    TrackScreen(HomeAnalytics.SCREEN)
    val spacing = AppTheme.spacing
    AppScreen(modifier = modifier, handleIme = false) { padding ->
        AppPullToRefresh(refreshing = state.refreshing, onRefresh = { onAction(UiAction.OnRefresh) }) {
            Column(
                modifier = Modifier.fillMaxSize().padding(padding).verticalScroll(rememberScrollState())
                    .padding(vertical = spacing.space16),
                verticalArrangement = Arrangement.spacedBy(spacing.space16),
            ) {
                HomeHeader(state, onAction, Modifier.padding(horizontal = spacing.space16))
                AppSearchBarStatic(
                    placeholder = stringResource(Res.string.home_search_hint),
                    onClick = { onAction(UiAction.OnSearchClick) },
                    modifier = Modifier.padding(horizontal = spacing.space16),
                )
                GenderTabs(state.gender, onAction, Modifier.padding(horizontal = spacing.space16))
                AppStateContent(
                    state = contentStateOf(
                        isLoading = state.loading,
                        isOffline = state.offline,
                        errorMessage = state.error,
                        isEmpty = false,
                        hasContent = state.hasContent,
                    ),
                    onRetry = { onAction(UiAction.OnRetry) },
                    loading = { HomeShimmer() },
                ) {
                    HomeContent(state, onAction)
                }
            }
        }
    }
    state.dialog?.let { dialog ->
        AppGlobalDialog(
            kind = dialog.kind(),
            onConfirm = { onAction(UiAction.OnDialogConfirm) },
            onDismiss = { onAction(UiAction.OnDialogDismiss) },
        )
    }
}

@Composable
private fun HomeHeader(state: UiState, onAction: (UiAction) -> Unit, modifier: Modifier = Modifier) {
    Row(modifier = modifier.fillMaxWidth(), verticalAlignment = Alignment.CenterVertically) {
        AppText(
            text = stringResource(Res.string.home_welcome, state.welcomeName),
            style = AppTheme.typography.headlineSmall,
            modifier = Modifier.weight(1f),
            maxLines = 1,
        )
        if (state.signedIn) {
            Box {
                AppIconButton(
                    icon = AppIcons.Notifications,
                    contentDescription = stringResource(Res.string.home_notifications),
                    onClick = { onAction(UiAction.OnNotificationsClick) },
                )
                AppCountBadge(count = state.unreadCount, modifier = Modifier.align(Alignment.TopEnd))
            }
        }
    }
}

@Composable
private fun GenderTabs(selected: Gender?, onAction: (UiAction) -> Unit, modifier: Modifier = Modifier) {
    val tabs = Gender.entries
    AppSegmentedTabs(
        tabs = tabs.map { stringResource(if (it == Gender.MALE) Res.string.home_tab_men else Res.string.home_tab_women) },
        selectedIndex = tabs.indexOf(selected).coerceAtLeast(0),
        onSelect = { onAction(UiAction.OnGenderSelect(tabs[it])) },
        modifier = modifier,
    )
}

@Composable
private fun HomeContent(state: UiState, onAction: (UiAction) -> Unit) {
    val spacing = AppTheme.spacing
    Column(verticalArrangement = Arrangement.spacedBy(spacing.space24)) {
        AppBannerCarousel(
            banners = state.banners.map { it.toUi() },
            onClick = { onAction(UiAction.OnBannerClick(it.id)) },
            modifier = Modifier.padding(horizontal = spacing.space16),
        )
        ServicesSection(state.services, onAction)
        RecommendedSection(state.recommended, onAction)
        NearestSection(state.nearest, onAction)
    }
}

/** One shimmer for the whole page, mirroring the sections (Design Script S03 "Unified loading"). */
@Composable
private fun HomeShimmer() {
    val spacing = AppTheme.spacing
    Column(
        modifier = Modifier.fillMaxWidth().padding(horizontal = spacing.space16),
        verticalArrangement = Arrangement.spacedBy(spacing.space24),
    ) {
        AppShimmerLine(Modifier.fillMaxWidth().height(AppTheme.sizes.cardImageHeight))
        repeat(SHIMMER_SECTIONS) { AppShimmerSection() }
    }
}

private fun HomeDialog.kind(): GlobalDialogKind = when (this) {
    HomeDialog.LocationExplanation -> GlobalDialogKind.LocationExplanation
    HomeDialog.LocationDenied -> GlobalDialogKind.LocationDenied
    HomeDialog.AuthRequired -> GlobalDialogKind.AuthRequired
}

private const val SHIMMER_SECTIONS = 3
