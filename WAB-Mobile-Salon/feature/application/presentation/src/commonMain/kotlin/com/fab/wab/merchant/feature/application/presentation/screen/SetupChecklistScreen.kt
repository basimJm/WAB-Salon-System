package com.fab.wab.merchant.feature.application.presentation.screen

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
import androidx.compose.material3.Icon
import androidx.compose.material3.LinearProgressIndicator
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.font.FontWeight
import com.fab.wab.merchant.core.analytics.compose.TrackScreen
import com.fab.wab.merchant.designsystem.components.button.AppButton
import com.fab.wab.merchant.designsystem.components.card.AppCard
import com.fab.wab.merchant.designsystem.components.feedback.AppErrorState
import com.fab.wab.merchant.designsystem.components.feedback.AppLoadingIndicator
import com.fab.wab.merchant.designsystem.components.layout.AppPullToRefresh
import com.fab.wab.merchant.designsystem.components.layout.AppScreen
import com.fab.wab.merchant.designsystem.components.section.AppSectionHeader
import com.fab.wab.merchant.designsystem.components.text.AppText
import com.fab.wab.merchant.designsystem.icons.AppIcons
import com.fab.wab.merchant.designsystem.theme.AppTheme
import com.fab.wab.merchant.feature.application.domain.model.SetupStep
import com.fab.wab.merchant.feature.application.domain.model.SetupStepStatus
import com.fab.wab.merchant.feature.application.presentation.analytics.ApplicationAnalytics
import com.fab.wab.merchant.feature.application.presentation.controller.contract.SetupChecklistContract.UiAction
import com.fab.wab.merchant.feature.application.presentation.controller.contract.SetupChecklistContract.UiState
import com.fab.wab.merchant.feature.application.presentation.resources.Res
import com.fab.wab.merchant.feature.application.presentation.resources.setup_all_pending
import com.fab.wab.merchant.feature.application.presentation.resources.setup_done
import com.fab.wab.merchant.feature.application.presentation.resources.setup_go_home
import com.fab.wab.merchant.feature.application.presentation.resources.setup_hint
import com.fab.wab.merchant.feature.application.presentation.resources.setup_left
import com.fab.wab.merchant.feature.application.presentation.resources.setup_live_body
import com.fab.wab.merchant.feature.application.presentation.resources.setup_live_title
import com.fab.wab.merchant.feature.application.presentation.resources.setup_optional
import com.fab.wab.merchant.feature.application.presentation.resources.setup_pending_note
import com.fab.wab.merchant.feature.application.presentation.resources.setup_progress
import com.fab.wab.merchant.feature.application.presentation.resources.setup_required
import com.fab.wab.merchant.feature.application.presentation.resources.setup_title
import org.jetbrains.compose.resources.pluralStringResource
import org.jetbrains.compose.resources.stringResource

/** PRD M06 (design 01 `on.check`): progress, required / optional steps, pending note, live success. */
@Composable
fun SetupChecklistScreen(state: UiState, onAction: (UiAction) -> Unit, modifier: Modifier = Modifier) {
    TrackScreen(ApplicationAnalytics.SCREEN_CHECKLIST)
    AppScreen(modifier = modifier) { padding ->
        when {
            state.loading && state.steps.isEmpty() -> Box(
                Modifier.fillMaxSize(),
                contentAlignment = Alignment.Center,
            ) { AppLoadingIndicator() }
            state.steps.isEmpty() -> AppErrorState(onRetry = { onAction(UiAction.OnRetry) }, message = state.error)
            state.isLive -> LiveSuccess(onAction)
            else -> AppPullToRefresh(
                refreshing = state.refreshing,
                onRefresh = { onAction(UiAction.OnRefresh) },
                modifier = Modifier.padding(padding),
            ) {
                ChecklistContent(state, onAction)
            }
        }
    }
}

@Composable
private fun ChecklistContent(state: UiState, onAction: (UiAction) -> Unit) {
    val spacing = AppTheme.spacing
    val colors = AppTheme.colors
    Column(
        modifier = Modifier.fillMaxSize().verticalScroll(rememberScrollState()).padding(spacing.space20),
        verticalArrangement = Arrangement.spacedBy(spacing.space12),
    ) {
        AppText(text = stringResource(Res.string.setup_title), style = AppTheme.typography.headlineMedium)
        AppText(
            text = stringResource(Res.string.setup_progress, state.done, state.total),
            style = AppTheme.typography.labelLarge,
            color = colors.accent,
        )
        LinearProgressIndicator(
            progress = { if (state.total == 0) 0f else state.done.toFloat() / state.total },
            modifier = Modifier.fillMaxWidth(),
            color = colors.gradientEnd,
            trackColor = colors.soft,
        )
        val message = when {
            state.remaining == 0 -> stringResource(Res.string.setup_all_pending)
            else -> pluralStringResource(Res.plurals.setup_left, state.remaining, state.remaining)
        }
        AppText(text = message, style = AppTheme.typography.bodyMedium, color = colors.muted)
        if (state.isPendingApproval) {
            AppText(
                text = stringResource(Res.string.setup_pending_note),
                style = AppTheme.typography.bodySmall,
                color = colors.onWarningContainer,
                modifier = Modifier.fillMaxWidth().background(colors.warningContainer, AppTheme.shapes.medium).padding(spacing.space12),
            )
        }
        AppSectionHeader(title = stringResource(Res.string.setup_required))
        state.steps.filter { it.step.required }.forEach { StepRow(it, onAction) }
        AppSectionHeader(title = stringResource(Res.string.setup_optional))
        state.steps.filterNot { it.step.required }.forEach { StepRow(it, onAction) }
        AppText(text = stringResource(Res.string.setup_hint), style = AppTheme.typography.bodySmall, color = colors.faint)
    }
}

@Composable
private fun StepRow(status: SetupStepStatus, onAction: (UiAction) -> Unit) {
    val colors = AppTheme.colors
    val spacing = AppTheme.spacing
    val copy = stepCopy(status.step)
    AppCard(
        modifier = Modifier.fillMaxWidth(),
        onClick = { onAction(UiAction.OnStepClick(status.step)) },
        contentPadding = spacing.space14,
    ) {
        Row(horizontalArrangement = Arrangement.spacedBy(spacing.space12), verticalAlignment = Alignment.CenterVertically) {
            val (icon, tint, fill) = if (status.done) Triple(
                AppIcons.Check,
                colors.onSuccessContainer,
                colors.successContainer,
            ) else Triple(copy.icon, colors.accent, colors.soft)
            Box(Modifier.size(AppTheme.sizes.avatarSmall).background(fill, AppTheme.shapes.circle), contentAlignment = Alignment.Center) {
                Icon(icon, contentDescription = null, tint = tint, modifier = Modifier.size(AppTheme.sizes.icon))
            }
            Column(modifier = Modifier.weight(1f)) {
                AppText(text = stringResource(copy.title), style = AppTheme.typography.titleSmall.copy(fontWeight = FontWeight.Bold))
                AppText(text = stringResource(copy.subtitle), style = AppTheme.typography.bodySmall, color = colors.muted)
            }
            if (status.done) {
                AppText(
                    text = stringResource(Res.string.setup_done),
                    style = AppTheme.typography.labelSmall,
                    color = colors.onSuccessContainer,
                )
            } else {
                Icon(AppIcons.Forward, contentDescription = null, tint = colors.faint, modifier = Modifier.size(AppTheme.sizes.iconSmall))
            }
        }
    }
}

@Composable
private fun LiveSuccess(onAction: (UiAction) -> Unit) {
    val spacing = AppTheme.spacing
    val colors = AppTheme.colors
    Column(
        modifier = Modifier.fillMaxSize().padding(spacing.space24),
        horizontalAlignment = Alignment.CenterHorizontally,
        verticalArrangement = Arrangement.spacedBy(spacing.space14, Alignment.CenterVertically),
    ) {
        Box(
            Modifier.size(AppTheme.sizes.illustration).background(colors.successContainer, AppTheme.shapes.circle),
            contentAlignment = Alignment.Center,
        ) {
            Icon(AppIcons.Check, contentDescription = null, tint = colors.success, modifier = Modifier.size(AppTheme.sizes.stateIcon))
        }
        AppText(text = stringResource(Res.string.setup_live_title), style = AppTheme.typography.headlineMedium)
        AppText(text = stringResource(Res.string.setup_live_body), style = AppTheme.typography.bodyMedium, color = colors.muted)
        AppButton(stringResource(Res.string.setup_go_home), { onAction(UiAction.OnGoHome) }, Modifier.fillMaxWidth())
    }
}

