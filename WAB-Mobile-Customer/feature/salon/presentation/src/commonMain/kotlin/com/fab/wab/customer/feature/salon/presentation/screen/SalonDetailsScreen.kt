package com.fab.wab.customer.feature.salon.presentation.screen

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.WindowInsets
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.navigationBars
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.windowInsetsPadding
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.verticalScroll
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import com.fab.wab.customer.core.analytics.compose.TrackScreen
import com.fab.wab.customer.core.domain.salon.SalonDetails
import com.fab.wab.customer.designsystem.components.button.AppIconButton
import com.fab.wab.customer.designsystem.components.button.AppPrimaryButton
import com.fab.wab.customer.designsystem.components.dialog.AppGlobalDialog
import com.fab.wab.customer.designsystem.components.dialog.GlobalDialogKind
import com.fab.wab.customer.designsystem.components.divider.AppDivider
import com.fab.wab.customer.designsystem.components.feedback.AppContentState
import com.fab.wab.customer.designsystem.components.feedback.AppOfflineState
import com.fab.wab.customer.designsystem.components.feedback.contentStateOf
import com.fab.wab.customer.designsystem.components.layout.AppPullToRefresh
import com.fab.wab.customer.designsystem.components.layout.AppScreen
import com.fab.wab.customer.designsystem.components.navigation.AppTopBar
import com.fab.wab.customer.designsystem.icons.AppIcons
import com.fab.wab.customer.designsystem.resources.Res as CoreRes
import com.fab.wab.customer.designsystem.resources.state_error_title
import com.fab.wab.customer.designsystem.theme.AppTheme
import com.fab.wab.customer.feature.salon.presentation.analytics.SalonAnalytics
import com.fab.wab.customer.feature.salon.presentation.controller.contract.SalonDetailsContract.SalonDialog
import com.fab.wab.customer.feature.salon.presentation.controller.contract.SalonDetailsContract.UiAction
import com.fab.wab.customer.feature.salon.presentation.controller.contract.SalonDetailsContract.UiState
import com.fab.wab.customer.feature.salon.presentation.resources.Res
import com.fab.wab.customer.feature.salon.presentation.resources.salon_book
import com.fab.wab.customer.feature.salon.presentation.resources.salon_error_body
import com.fab.wab.customer.feature.salon.presentation.resources.salon_favorite_add
import com.fab.wab.customer.feature.salon.presentation.resources.salon_favorite_remove
import com.fab.wab.customer.feature.salon.presentation.resources.salon_retry
import com.fab.wab.customer.feature.salon.presentation.resources.salon_share
import org.jetbrains.compose.resources.stringResource

/** S07: top bar (share, favorite), cover + overlapping logo, sections, sticky always-enabled Book now. */
@Composable
fun SalonDetailsScreen(state: UiState, onAction: (UiAction) -> Unit, onBack: () -> Unit, modifier: Modifier = Modifier) {
    TrackScreen(SalonAnalytics.SCREEN)
    val salon = state.salon
    AppScreen(
        modifier = modifier,
        topBar = {
            AppTopBar(title = salon?.name.orEmpty(), onBack = onBack) {
                if (salon != null) TopActions(salon.isFavorite, onAction)
            }
        },
        bottomBar = { if (salon != null) BookBar(onAction) },
    ) { padding ->
        AppPullToRefresh(
            refreshing = state.refreshing,
            onRefresh = { onAction(UiAction.OnRefresh) },
            modifier = Modifier.fillMaxSize().padding(padding),
        ) {
            SalonContent(state, onAction)
        }
    }
    state.dialog?.let { dialog ->
        AppGlobalDialog(
            kind = when (dialog) { SalonDialog.AuthRequired -> GlobalDialogKind.AuthRequired },
            onConfirm = { onAction(UiAction.OnDialogConfirm) },
            onDismiss = { onAction(UiAction.OnDialogDismiss) },
        )
    }
}

@Composable
private fun SalonContent(state: UiState, onAction: (UiAction) -> Unit) {
    val salon = state.salon
    val content = contentStateOf(
        isLoading = state.loading,
        isOffline = state.offline,
        errorMessage = state.error,
        isEmpty = false,
        hasContent = salon != null,
    )
    when (content) {
        AppContentState.Loading -> SalonShimmer()
        AppContentState.Offline -> Box(Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
            AppOfflineState(onRetry = { onAction(UiAction.OnRetry) })
        }
        is AppContentState.Error -> SalonStatePlaceholder(
            icon = SalonIcons.Warning,
            title = stringResource(CoreRes.string.state_error_title),
            message = content.message ?: stringResource(Res.string.salon_error_body),
            actionText = stringResource(Res.string.salon_retry),
            onAction = { onAction(UiAction.OnRetry) },
        )
        else -> if (salon != null) SalonBody(salon, state.hoursExpanded, onAction)
    }
}

/** Share (20 px) and the pink heart (filled when favorite), 44 px targets at the End of the bar. */
@Composable
private fun TopActions(isFavorite: Boolean, onAction: (UiAction) -> Unit) {
    AppIconButton(AppIcons.Share, stringResource(Res.string.salon_share), onClick = { onAction(UiAction.OnShareClick) })
    AppIconButton(
        icon = if (isFavorite) AppIcons.Favorite else AppIcons.FavoriteBorder,
        contentDescription = stringResource(if (isFavorite) Res.string.salon_favorite_remove else Res.string.salon_favorite_add),
        onClick = { onAction(UiAction.OnFavoriteClick) },
        tint = AppTheme.colors.danger,
    )
}

/** Sticky bar: hairline on top, card background, 54 px gradient button, safe-area bottom. */
@Composable
private fun BookBar(onAction: (UiAction) -> Unit) {
    Column(Modifier.fillMaxWidth().background(AppTheme.colors.card)) {
        AppDivider()
        AppPrimaryButton(
            text = stringResource(Res.string.salon_book),
            onClick = { onAction(UiAction.OnBookClick) },
            modifier = Modifier
                .fillMaxWidth()
                .padding(horizontal = AppTheme.spacing.space20, vertical = AppTheme.spacing.space12)
                .windowInsetsPadding(WindowInsets.navigationBars),
        )
    }
}

@Composable
private fun SalonBody(salon: SalonDetails, hoursExpanded: Boolean, onAction: (UiAction) -> Unit) {
    Column(modifier = Modifier.fillMaxSize().verticalScroll(rememberScrollState()).padding(bottom = AppTheme.spacing.space24)) {
        SalonHeader(salon, onAction)
        ContactRow(salon, onAction)
        Description(salon)
        WorkingHoursCard(salon, hoursExpanded, onAction)
        StaffSection(salon, onAction)
        ReviewsSection(salon, onAction)
        ServicesSection(salon, onAction)
        GallerySection(salon, onAction)
    }
}
