package com.fab.wab.customer.feature.home.presentation.screen

import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.WindowInsets
import androidx.compose.foundation.layout.defaultMinSize
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.offset
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
import androidx.compose.ui.semantics.Role
import androidx.compose.ui.text.font.FontWeight
import com.fab.wab.customer.core.analytics.compose.TrackScreen
import com.fab.wab.customer.designsystem.components.badge.countBadgeLabel
import com.fab.wab.customer.designsystem.components.dialog.AppGlobalDialog
import com.fab.wab.customer.designsystem.components.dialog.GlobalDialogKind
import com.fab.wab.customer.designsystem.components.layout.AppPullToRefresh
import com.fab.wab.customer.designsystem.components.layout.AppScreen
import com.fab.wab.customer.designsystem.components.text.AppText
import com.fab.wab.customer.designsystem.icons.AppIcons
import com.fab.wab.customer.designsystem.theme.AppTheme
import com.fab.wab.customer.feature.home.presentation.analytics.HomeAnalytics
import com.fab.wab.customer.feature.home.presentation.controller.contract.HomeContract.HomeDialog
import com.fab.wab.customer.feature.home.presentation.controller.contract.HomeContract.UiAction
import com.fab.wab.customer.feature.home.presentation.controller.contract.HomeContract.UiState
import com.fab.wab.customer.feature.home.presentation.resources.Res
import com.fab.wab.customer.feature.home.presentation.resources.home_hello_sub
import com.fab.wab.customer.feature.home.presentation.resources.home_notifications
import com.fab.wab.customer.feature.home.presentation.resources.home_welcome
import org.jetbrains.compose.resources.stringResource

/** S03 (design `on.home`): greeting + bell → banner → search → gender tabs → services / recommended / nearest. */
@Composable
fun HomeScreen(state: UiState, onAction: (UiAction) -> Unit, modifier: Modifier = Modifier) {
    TrackScreen(HomeAnalytics.SCREEN)
    AppScreen(modifier = modifier, handleIme = false) { _ ->
        AppPullToRefresh(refreshing = state.refreshing, onRefresh = { onAction(UiAction.OnRefresh) }) {
            Box(Modifier.fillMaxSize().windowInsetsPadding(WindowInsets.statusBars)) {
                when {
                    state.loading && !state.hasContent -> HomeShimmer()
                    !state.hasContent && (state.offline || state.error != null) -> DiscoveryPlaceholderView(
                        placeholder = if (state.offline) DiscoveryPlaceholder.Offline else DiscoveryPlaceholder.ServerError,
                        onRetry = { onAction(UiAction.OnRetry) },
                        paddingHorizontal = DiscoveryDesign.PLACEHOLDER_PADDING_H_HOME,
                    )
                    else -> HomeReady(state, onAction)
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
private fun HomeReady(state: UiState, onAction: (UiAction) -> Unit) {
    val spacing = AppTheme.spacing
    Column(modifier = Modifier.fillMaxSize().verticalScroll(rememberScrollState()).padding(bottom = spacing.space20)) {
        HomeHeader(state, onAction)
        HomeBanners(state.banners, onAction, Modifier.padding(horizontal = spacing.space20))
        HomeSearchButton(
            onClick = { onAction(UiAction.OnSearchClick) },
            Modifier.padding(start = spacing.space20, end = spacing.space20, top = spacing.space16),
        )
        GenderTabs(state.gender, onAction, Modifier.padding(start = spacing.space20, end = spacing.space20, top = spacing.space14))
        ServicesSection(state.services, onAction)
        RecommendedSection(state.recommended, onAction)
        NearestSection(state.nearest, onAction)
    }
}

/** `helloSub` (12.5 sp muted) over `hello` (Playfair 21 sp bold); 44 dp soft bell with the unread badge when signed in. */
@Composable
private fun HomeHeader(state: UiState, onAction: (UiAction) -> Unit) {
    val spacing = AppTheme.spacing
    Row(
        modifier = Modifier
            .fillMaxWidth()
            .padding(start = spacing.space20, end = spacing.space20, top = DiscoveryDesign.HEADER_PADDING_TOP, bottom = spacing.space16),
        verticalAlignment = Alignment.CenterVertically,
        horizontalArrangement = Arrangement.SpaceBetween,
    ) {
        Column(Modifier.weight(1f)) {
            AppText(
                text = stringResource(Res.string.home_hello_sub),
                style = discoveryBody(DiscoveryDesign.TEXT_12_5),
                color = AppTheme.colors.muted,
            )
            AppText(
                text = stringResource(Res.string.home_welcome, state.welcomeName),
                style = discoveryHeadline(DiscoveryDesign.TEXT_21),
                maxLines = 1,
            )
        }
        if (state.signedIn) {
            NotificationBell(state.unreadCount, onClick = { onAction(UiAction.OnNotificationsClick) })
        }
    }
}

@Composable
private fun NotificationBell(unreadCount: Int, onClick: () -> Unit) {
    val colors = AppTheme.colors
    Box {
        Box(
            modifier = Modifier
                .size(DiscoveryDesign.BELL_SIZE)
                .background(colors.soft, AppTheme.shapes.circle)
                .clickable(role = Role.Button, onClick = onClick),
            contentAlignment = Alignment.Center,
        ) {
            Icon(
                imageVector = AppIcons.Notifications,
                contentDescription = stringResource(Res.string.home_notifications),
                tint = colors.accent,
                modifier = Modifier.size(DiscoveryDesign.BELL_ICON),
            )
        }
        countBadgeLabel(unreadCount)?.let { label ->
            Box(
                modifier = Modifier
                    .align(Alignment.TopEnd)
                    .offset(x = DiscoveryDesign.BADGE_OFFSET_END, y = -DiscoveryDesign.BADGE_OFFSET_TOP)
                    .background(colors.background, AppTheme.shapes.pill)
                    .padding(DiscoveryDesign.BADGE_BORDER)
                    .defaultMinSize(minWidth = DiscoveryDesign.BADGE_MIN_WIDTH - DiscoveryDesign.BADGE_BORDER * BORDER_SIDES)
                    .height(DiscoveryDesign.BADGE_HEIGHT - DiscoveryDesign.BADGE_BORDER * BORDER_SIDES)
                    .background(colors.danger, AppTheme.shapes.pill)
                    .padding(horizontal = DiscoveryDesign.BADGE_PADDING_H),
                contentAlignment = Alignment.Center,
            ) {
                AppText(
                    text = label,
                    style = discoveryBody(DiscoveryDesign.TEXT_10_5, FontWeight.Bold),
                    color = colors.onGradient,
                    maxLines = 1,
                )
            }
        }
    }
}

private fun HomeDialog.kind(): GlobalDialogKind = when (this) {
    HomeDialog.LocationExplanation -> GlobalDialogKind.LocationExplanation
    HomeDialog.LocationDenied -> GlobalDialogKind.LocationDenied
    HomeDialog.AuthRequired -> GlobalDialogKind.AuthRequired
}

private const val BORDER_SIDES = 2
