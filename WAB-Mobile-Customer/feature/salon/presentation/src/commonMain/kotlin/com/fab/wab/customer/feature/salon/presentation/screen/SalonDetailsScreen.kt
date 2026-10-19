package com.fab.wab.customer.feature.salon.presentation.screen

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.offset
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.verticalScroll
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import com.fab.wab.customer.core.analytics.compose.TrackScreen
import com.fab.wab.customer.core.domain.salon.SalonDetails
import com.fab.wab.customer.designsystem.components.avatar.AppAvatar
import com.fab.wab.customer.designsystem.components.button.AppIconButton
import com.fab.wab.customer.designsystem.components.button.AppPrimaryButton
import com.fab.wab.customer.designsystem.components.dialog.AppGlobalDialog
import com.fab.wab.customer.designsystem.components.dialog.GlobalDialogKind
import com.fab.wab.customer.designsystem.components.feedback.AppStateContent
import com.fab.wab.customer.designsystem.components.feedback.contentStateOf
import com.fab.wab.customer.designsystem.components.image.AppImage
import com.fab.wab.customer.designsystem.components.layout.AppPullToRefresh
import com.fab.wab.customer.designsystem.components.layout.AppScreen
import com.fab.wab.customer.designsystem.components.navigation.AppTopBar
import com.fab.wab.customer.designsystem.components.shimmer.AppShimmerLine
import com.fab.wab.customer.designsystem.components.shimmer.AppShimmerList
import com.fab.wab.customer.designsystem.icons.AppIcons
import com.fab.wab.customer.designsystem.theme.AppTheme
import com.fab.wab.customer.feature.salon.presentation.analytics.SalonAnalytics
import com.fab.wab.customer.feature.salon.presentation.controller.contract.SalonDetailsContract.SalonDialog
import com.fab.wab.customer.feature.salon.presentation.controller.contract.SalonDetailsContract.UiAction
import com.fab.wab.customer.feature.salon.presentation.controller.contract.SalonDetailsContract.UiState
import com.fab.wab.customer.feature.salon.presentation.resources.Res
import com.fab.wab.customer.feature.salon.presentation.resources.salon_book
import com.fab.wab.customer.feature.salon.presentation.resources.salon_cover
import com.fab.wab.customer.feature.salon.presentation.resources.salon_favorite_add
import com.fab.wab.customer.feature.salon.presentation.resources.salon_favorite_remove
import com.fab.wab.customer.feature.salon.presentation.resources.salon_share
import org.jetbrains.compose.resources.stringResource

/** S07: top bar (share, favorite), cover + profile, sections, sticky always-enabled Book. */
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
        bottomBar = {
            if (salon != null) {
                AppPrimaryButton(
                    text = stringResource(Res.string.salon_book),
                    onClick = { onAction(UiAction.OnBookClick) },
                    modifier = Modifier.fillMaxWidth().padding(AppTheme.spacing.space16),
                )
            }
        },
    ) { padding ->
        AppPullToRefresh(
            refreshing = state.refreshing,
            onRefresh = { onAction(UiAction.OnRefresh) },
            modifier = Modifier.fillMaxSize().padding(padding),
        ) {
            AppStateContent(
                state = contentStateOf(
                    isLoading = state.loading,
                    isOffline = state.offline,
                    errorMessage = state.error,
                    isEmpty = false,
                    hasContent = salon != null,
                ),
                onRetry = { onAction(UiAction.OnRetry) },
                modifier = Modifier.fillMaxSize(),
                loading = { SalonShimmer() },
            ) {
                if (salon != null) SalonBody(salon, state.hoursExpanded, onAction)
            }
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
private fun TopActions(isFavorite: Boolean, onAction: (UiAction) -> Unit) {
    AppIconButton(AppIcons.Share, stringResource(Res.string.salon_share), onClick = { onAction(UiAction.OnShareClick) })
    AppIconButton(
        icon = if (isFavorite) AppIcons.Favorite else AppIcons.FavoriteBorder,
        contentDescription = stringResource(if (isFavorite) Res.string.salon_favorite_remove else Res.string.salon_favorite_add),
        onClick = { onAction(UiAction.OnFavoriteClick) },
        tint = if (isFavorite) AppTheme.colors.danger else AppTheme.colors.ink,
    )
}

@Composable
private fun SalonBody(salon: SalonDetails, hoursExpanded: Boolean, onAction: (UiAction) -> Unit) {
    val spacing = AppTheme.spacing
    Column(
        modifier = Modifier.fillMaxSize().verticalScroll(rememberScrollState()).padding(bottom = spacing.space24),
        verticalArrangement = Arrangement.spacedBy(spacing.space16),
    ) {
        CoverWithProfile(salon)
        Column(modifier = Modifier.padding(horizontal = spacing.space16), verticalArrangement = Arrangement.spacedBy(spacing.space16)) {
            StatusAndHours(salon)
            LocationRow(salon, onAction)
            ContactRow(salon, onAction)
            Description(salon)
            WorkingHoursSection(salon, hoursExpanded, onAction)
            StaffSection(salon, onAction)
            ReviewsSection(salon, onAction)
            ServicesSection(salon, onAction)
            GallerySection(salon, onAction)
        }
    }
}

/** Cover with the circular profile image overlapping its bottom centre (PRD S07 item 2). */
@Composable
private fun CoverWithProfile(salon: SalonDetails) {
    val avatar = AppTheme.sizes.avatarLarge
    val overlap = avatar / AVATAR_OVERLAP_DIVISOR
    val coverDescription = stringResource(Res.string.salon_cover)
    Box(modifier = Modifier.fillMaxWidth().padding(bottom = overlap)) {
        Box(modifier = Modifier.fillMaxWidth().height(AppTheme.sizes.cardImageHeight)) {
            salon.coverUrl?.let { AppImage(modifier = Modifier.fillMaxSize(), url = it, contentDescription = coverDescription) }
        }
        AppAvatar(
            name = salon.name,
            imageUrl = salon.profileImageUrl,
            size = avatar,
            modifier = Modifier.align(Alignment.BottomCenter).offset(y = overlap),
        )
    }
}

@Composable
private fun SalonShimmer() {
    val spacing = AppTheme.spacing
    Column(verticalArrangement = Arrangement.spacedBy(spacing.space16)) {
        AppShimmerLine(Modifier.fillMaxWidth().height(AppTheme.sizes.cardImageHeight))
        AppShimmerList(Modifier.padding(spacing.space16))
    }
}

/** The profile image sits half over the cover (Facebook-style, PRD S07 item 2). */
private const val AVATAR_OVERLAP_DIVISOR = 2
