package com.fab.wab.merchant.feature.application.presentation.screen

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.verticalScroll
import androidx.compose.material3.Icon
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.text.style.TextAlign
import com.fab.wab.merchant.core.analytics.compose.TrackScreen
import com.fab.wab.merchant.core.common.TimeFormat
import com.fab.wab.merchant.designsystem.components.brand.AppWordmark
import com.fab.wab.merchant.designsystem.components.button.AppButton
import com.fab.wab.merchant.designsystem.components.button.ButtonKind
import com.fab.wab.merchant.designsystem.components.card.AppCard
import com.fab.wab.merchant.designsystem.components.feedback.AppErrorState
import com.fab.wab.merchant.designsystem.components.feedback.AppLoadingIndicator
import com.fab.wab.merchant.designsystem.components.layout.AppPullToRefresh
import com.fab.wab.merchant.designsystem.components.layout.AppScreen
import com.fab.wab.merchant.designsystem.components.text.AppText
import com.fab.wab.merchant.designsystem.icons.AppIcons
import com.fab.wab.merchant.designsystem.theme.AppTheme
import com.fab.wab.merchant.feature.application.domain.model.SalonApplication
import com.fab.wab.merchant.feature.application.presentation.analytics.ApplicationAnalytics
import com.fab.wab.merchant.feature.application.presentation.controller.contract.ApplicationPhase
import com.fab.wab.merchant.feature.application.presentation.controller.contract.ApplicationStatusContract.UiAction
import com.fab.wab.merchant.feature.application.presentation.controller.contract.ApplicationStatusContract.UiState
import com.fab.wab.merchant.feature.application.presentation.resources.Res
import com.fab.wab.merchant.feature.application.presentation.resources.status_approved_body
import com.fab.wab.merchant.feature.application.presentation.resources.status_approved_title
import com.fab.wab.merchant.feature.application.presentation.resources.status_continue
import com.fab.wab.merchant.feature.application.presentation.resources.status_pending_body
import com.fab.wab.merchant.feature.application.presentation.resources.status_pending_title
import com.fab.wab.merchant.feature.application.presentation.resources.status_prepare
import com.fab.wab.merchant.feature.application.presentation.resources.status_prepare_body
import com.fab.wab.merchant.feature.application.presentation.resources.status_reason
import com.fab.wab.merchant.feature.application.presentation.resources.status_refresh
import com.fab.wab.merchant.feature.application.presentation.resources.status_rejected_body
import com.fab.wab.merchant.feature.application.presentation.resources.status_rejected_title
import com.fab.wab.merchant.feature.application.presentation.resources.status_resubmit
import com.fab.wab.merchant.feature.application.presentation.resources.status_submitted
import org.jetbrains.compose.resources.StringResource
import org.jetbrains.compose.resources.stringResource

/** PRD M05 (design 01 `on.status`): pending / rejected / approved, pull to refresh. */
@Composable
fun ApplicationStatusScreen(state: UiState, onAction: (UiAction) -> Unit, modifier: Modifier = Modifier) {
    TrackScreen(ApplicationAnalytics.SCREEN_STATUS)
    AppScreen(modifier = modifier) { padding ->
        val application = state.application
        when {
            state.loading && application == null -> Box(Modifier.fillMaxSize(), contentAlignment = Alignment.Center) { AppLoadingIndicator() }
            application == null -> AppErrorState(onRetry = { onAction(UiAction.OnRetry) }, message = state.error)
            else -> AppPullToRefresh(refreshing = state.refreshing, onRefresh = { onAction(UiAction.OnRefresh) }, modifier = Modifier.padding(padding)) {
                StatusContent(application, state.phase ?: ApplicationPhase.PENDING, onAction)
            }
        }
    }
}

private data class PhaseCopy(val icon: ImageVector, val title: StringResource, val body: StringResource)

private fun copyOf(phase: ApplicationPhase): PhaseCopy = when (phase) {
    ApplicationPhase.PENDING -> PhaseCopy(AppIcons.Clock, Res.string.status_pending_title, Res.string.status_pending_body)
    ApplicationPhase.REJECTED -> PhaseCopy(AppIcons.Error, Res.string.status_rejected_title, Res.string.status_rejected_body)
    ApplicationPhase.APPROVED -> PhaseCopy(AppIcons.Check, Res.string.status_approved_title, Res.string.status_approved_body)
}

@Composable
private fun StatusContent(application: SalonApplication, phase: ApplicationPhase, onAction: (UiAction) -> Unit) {
    val spacing = AppTheme.spacing
    val colors = AppTheme.colors
    val copy = copyOf(phase)
    val tint = when (phase) {
        ApplicationPhase.PENDING -> colors.onWarningContainer
        ApplicationPhase.REJECTED -> colors.danger
        ApplicationPhase.APPROVED -> colors.success
    }
    Column(
        modifier = Modifier.fillMaxSize().verticalScroll(rememberScrollState()).padding(spacing.space24),
        horizontalAlignment = Alignment.CenterHorizontally,
        verticalArrangement = Arrangement.spacedBy(spacing.space14),
    ) {
        AppWordmark()
        Box(Modifier.size(AppTheme.sizes.illustration).background(colors.soft, AppTheme.shapes.circle), contentAlignment = Alignment.Center) {
            Icon(copy.icon, contentDescription = null, tint = tint, modifier = Modifier.size(AppTheme.sizes.stateIcon))
        }
        AppText(text = stringResource(copy.title), style = AppTheme.typography.headlineMedium, textAlign = TextAlign.Center)
        AppText(text = stringResource(copy.body), style = AppTheme.typography.bodyMedium, color = colors.muted, textAlign = TextAlign.Center)
        application.submittedAt?.let { submitted ->
            val date = TimeFormat.isoDateText(submitted.toString()).orEmpty()
            AppText(text = stringResource(Res.string.status_submitted, date), style = AppTheme.typography.labelMedium, color = colors.faint)
        }
        PhaseActions(application, phase, onAction)
    }
}

@Composable
private fun PhaseActions(application: SalonApplication, phase: ApplicationPhase, onAction: (UiAction) -> Unit) {
    val spacing = AppTheme.spacing
    when (phase) {
        ApplicationPhase.PENDING -> {
            AppCard(modifier = Modifier.fillMaxWidth()) {
                Column(verticalArrangement = Arrangement.spacedBy(spacing.space8)) {
                    AppText(text = stringResource(Res.string.status_prepare), style = AppTheme.typography.titleSmall)
                    AppText(text = stringResource(Res.string.status_prepare_body), style = AppTheme.typography.bodySmall, color = AppTheme.colors.muted)
                    AppButton(stringResource(Res.string.status_prepare), { onAction(UiAction.OnPrepareProfile) }, Modifier.fillMaxWidth())
                }
            }
            AppButton(stringResource(Res.string.status_refresh), { onAction(UiAction.OnRefresh) }, Modifier.fillMaxWidth(), kind = ButtonKind.Text)
        }
        ApplicationPhase.REJECTED -> {
            application.rejectionReason?.let { reason ->
                AppCard(modifier = Modifier.fillMaxWidth()) {
                    Column(verticalArrangement = Arrangement.spacedBy(spacing.space6)) {
                        AppText(text = stringResource(Res.string.status_reason), style = AppTheme.typography.labelMedium, color = AppTheme.colors.danger)
                        AppText(text = reason, style = AppTheme.typography.bodyMedium)
                    }
                }
            }
            AppButton(stringResource(Res.string.status_resubmit), { onAction(UiAction.OnResubmit) }, Modifier.fillMaxWidth())
        }
        ApplicationPhase.APPROVED ->
            AppButton(stringResource(Res.string.status_continue), { onAction(UiAction.OnContinue) }, Modifier.fillMaxWidth())
    }
}
