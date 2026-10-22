package com.fab.wab.merchant.feature.salon.presentation.screen

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.text.font.FontWeight
import com.fab.wab.merchant.core.analytics.compose.TrackScreen
import com.fab.wab.merchant.designsystem.components.badge.AppStatusBadge
import com.fab.wab.merchant.designsystem.components.badge.StatusTone
import com.fab.wab.merchant.designsystem.components.button.AppButton
import com.fab.wab.merchant.designsystem.components.button.ButtonKind
import com.fab.wab.merchant.designsystem.components.card.AppCard
import com.fab.wab.merchant.designsystem.components.feedback.AppEmptyState
import com.fab.wab.merchant.designsystem.components.feedback.AppErrorState
import com.fab.wab.merchant.designsystem.components.feedback.AppLoadingIndicator
import com.fab.wab.merchant.designsystem.components.image.AppImage
import com.fab.wab.merchant.designsystem.components.layout.AppPagedList
import com.fab.wab.merchant.designsystem.components.layout.AppScreen
import com.fab.wab.merchant.designsystem.components.navigation.AppTopBar
import com.fab.wab.merchant.designsystem.components.text.AppText
import com.fab.wab.merchant.designsystem.components.textfield.AppSearchBar
import com.fab.wab.merchant.designsystem.theme.AppTheme
import com.fab.wab.merchant.feature.salon.domain.CatalogService
import com.fab.wab.merchant.feature.salon.presentation.analytics.SalonAnalytics
import com.fab.wab.merchant.feature.salon.presentation.controller.contract.CatalogPickerContract.UiAction
import com.fab.wab.merchant.feature.salon.presentation.controller.contract.CatalogPickerContract.UiState
import com.fab.wab.merchant.feature.salon.presentation.resources.Res
import com.fab.wab.merchant.feature.salon.presentation.resources.catalog_added
import com.fab.wab.merchant.feature.salon.presentation.resources.catalog_cant_find
import com.fab.wab.merchant.feature.salon.presentation.resources.catalog_empty
import com.fab.wab.merchant.feature.salon.presentation.resources.catalog_note_men
import com.fab.wab.merchant.feature.salon.presentation.resources.catalog_note_women
import com.fab.wab.merchant.feature.salon.presentation.resources.catalog_request
import com.fab.wab.merchant.feature.salon.presentation.resources.catalog_search
import com.fab.wab.merchant.feature.salon.presentation.resources.catalog_title
import org.jetbrains.compose.resources.stringResource

private const val DESCRIPTION_LINES = 2

/** PRD M16 catalog picker (design 06 `on.catalog`): gender catalog, search, "Added" marks, request link. */
@Composable
fun CatalogPickerScreen(state: UiState, canRequest: Boolean, onAction: (UiAction) -> Unit, onBack: () -> Unit, modifier: Modifier = Modifier) {
    TrackScreen(SalonAnalytics.SCREEN_CATALOG)
    val spacing = AppTheme.spacing
    AppScreen(modifier = modifier, topBar = { AppTopBar(title = stringResource(Res.string.catalog_title), onBack = onBack) }) { padding ->
        Box(modifier = Modifier.fillMaxSize().padding(padding)) {
            when {
                state.loading -> AppLoadingIndicator(Modifier.align(Alignment.Center))
                state.error != null -> AppErrorState(onRetry = { onAction(UiAction.OnRetry) }, message = state.error)
                else -> Column {
                    Column(modifier = Modifier.padding(horizontal = spacing.space16, vertical = spacing.space8), verticalArrangement = Arrangement.spacedBy(spacing.space6)) {
                        AppSearchBar(value = state.query, onValueChange = { onAction(UiAction.OnQuery(it)) }, placeholder = stringResource(Res.string.catalog_search))
                        AppText(
                            text = stringResource(if (state.womenSalon) Res.string.catalog_note_women else Res.string.catalog_note_men),
                            style = AppTheme.typography.labelMedium,
                            color = AppTheme.colors.muted,
                        )
                        if (canRequest) {
                            Row(verticalAlignment = Alignment.CenterVertically) {
                                AppText(text = stringResource(Res.string.catalog_cant_find), style = AppTheme.typography.bodySmall, modifier = Modifier.weight(1f))
                                AppButton(stringResource(Res.string.catalog_request), { onAction(UiAction.OnRequest) }, kind = ButtonKind.Text)
                            }
                        }
                    }
                    if (state.items.isEmpty()) {
                        AppEmptyState(title = stringResource(Res.string.catalog_empty), modifier = Modifier.fillMaxWidth().padding(spacing.space24))
                    }
                    AppPagedList(
                        items = state.shown,
                        itemKey = { it.id },
                        hasMore = state.hasMore && state.query.isBlank(),
                        loadingMore = state.loadingMore,
                        onLoadMore = { onAction(UiAction.OnLoadMore) },
                        contentPadding = PaddingValues(spacing.space16),
                    ) { item -> CatalogRow(item, added = item.id in state.added) { onAction(UiAction.OnItemClick(item.id)) } }
                }
            }
        }
    }
}

@Composable
private fun CatalogRow(item: CatalogService, added: Boolean, onClick: () -> Unit) {
    val spacing = AppTheme.spacing
    AppCard(modifier = Modifier.fillMaxWidth().padding(bottom = spacing.space10), onClick = onClick) {
        Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(spacing.space12)) {
            AppImage(item.imageUrl, Modifier.size(AppTheme.sizes.avatar).clip(AppTheme.shapes.medium))
            Column(modifier = Modifier.weight(1f), verticalArrangement = Arrangement.spacedBy(spacing.space4)) {
                AppText(text = item.name, style = AppTheme.typography.titleSmall.copy(fontWeight = FontWeight.Bold))
                AppText(text = item.description, style = AppTheme.typography.bodySmall, color = AppTheme.colors.muted, maxLines = DESCRIPTION_LINES)
            }
            if (added) AppStatusBadge(text = stringResource(Res.string.catalog_added), tone = StatusTone.Success)
        }
    }
}
