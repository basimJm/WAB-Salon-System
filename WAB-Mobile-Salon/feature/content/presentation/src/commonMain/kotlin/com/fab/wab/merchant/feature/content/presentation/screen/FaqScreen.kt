package com.fab.wab.merchant.feature.content.presentation.screen

import androidx.compose.animation.AnimatedVisibility
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.material3.Icon
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import com.fab.wab.merchant.core.analytics.compose.TrackScreen
import com.fab.wab.merchant.designsystem.components.card.AppCard
import com.fab.wab.merchant.designsystem.components.feedback.AppEmptyState
import com.fab.wab.merchant.designsystem.components.feedback.AppStateContent
import com.fab.wab.merchant.designsystem.components.feedback.contentStateOf
import com.fab.wab.merchant.designsystem.components.layout.AppScreen
import com.fab.wab.merchant.designsystem.components.navigation.AppTopBar
import com.fab.wab.merchant.designsystem.components.text.AppText
import com.fab.wab.merchant.designsystem.icons.AppIcons
import com.fab.wab.merchant.designsystem.theme.AppTheme
import com.fab.wab.merchant.feature.content.domain.model.FaqItem
import com.fab.wab.merchant.feature.content.presentation.analytics.ContentAnalytics
import com.fab.wab.merchant.feature.content.presentation.controller.contract.FaqContract.UiAction
import com.fab.wab.merchant.feature.content.presentation.controller.contract.FaqContract.UiState
import com.fab.wab.merchant.feature.content.presentation.resources.Res
import com.fab.wab.merchant.feature.content.presentation.resources.faq_empty
import com.fab.wab.merchant.feature.content.presentation.resources.faq_title
import org.jetbrains.compose.resources.stringResource

private const val FAQ_ITEM_TYPE = "faq"

/** S23 FAQ: one card per question, tap to expand the answer. */
@Composable
fun FaqScreen(state: UiState, onAction: (UiAction) -> Unit, onBack: () -> Unit, modifier: Modifier = Modifier) {
    TrackScreen(ContentAnalytics.FAQ_SCREEN)
    val spacing = AppTheme.spacing
    AppScreen(modifier = modifier, topBar = { AppTopBar(title = stringResource(Res.string.faq_title), onBack = onBack) }) { padding ->
        AppStateContent(
            state = contentStateOf(
                state.loading,
                state.offline,
                state.error,
                isEmpty = state.loaded && state.items.isEmpty(),
                hasContent = state.items.isNotEmpty(),
            ),
            onRetry = { onAction(UiAction.OnRetry) },
            modifier = Modifier.fillMaxSize().padding(padding),
            empty = { AppEmptyState(title = stringResource(Res.string.faq_empty)) },
        ) {
            LazyColumn(
                modifier = Modifier.fillMaxSize(),
                contentPadding = PaddingValues(spacing.space16),
                verticalArrangement = Arrangement.spacedBy(spacing.space8),
            ) {
                items(state.items, key = { it.id }, contentType = { FAQ_ITEM_TYPE }) { item ->
                    FaqRow(item, expanded = item.id in state.expanded, onToggle = { onAction(UiAction.OnToggle(item.id)) })
                }
            }
        }
    }
}

@Composable
private fun FaqRow(item: FaqItem, expanded: Boolean, onToggle: () -> Unit) {
    val spacing = AppTheme.spacing
    AppCard(modifier = Modifier.fillMaxWidth().clickable(onClick = onToggle)) {
        Column(verticalArrangement = Arrangement.spacedBy(spacing.space8)) {
            Row(modifier = Modifier.fillMaxWidth(), verticalAlignment = Alignment.CenterVertically) {
                AppText(text = item.question, style = AppTheme.typography.titleSmall, modifier = Modifier.weight(1f))
                Icon(if (expanded) AppIcons.ExpandLess else AppIcons.ExpandMore, contentDescription = null, tint = AppTheme.colors.muted)
            }
            AnimatedVisibility(visible = expanded) {
                AppText(text = item.answer, style = AppTheme.typography.bodyMedium, color = AppTheme.colors.muted)
            }
        }
    }
}
