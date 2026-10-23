package com.fab.wab.merchant.feature.salon.presentation.screen

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.verticalScroll
import androidx.compose.material3.Icon
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.font.FontWeight
import com.fab.wab.merchant.core.analytics.compose.TrackScreen
import com.fab.wab.merchant.core.common.TimeFormat
import com.fab.wab.merchant.core.domain.session.SalonState
import com.fab.wab.merchant.designsystem.components.badge.AppStatusBadge
import com.fab.wab.merchant.designsystem.components.badge.StatusTone
import com.fab.wab.merchant.designsystem.components.button.AppButton
import com.fab.wab.merchant.designsystem.components.card.AppCard
import com.fab.wab.merchant.designsystem.components.dashboard.AppSalonStateChip
import com.fab.wab.merchant.designsystem.components.dashboard.salonStateLabel
import com.fab.wab.merchant.designsystem.components.dialog.AppContactSheet
import com.fab.wab.merchant.designsystem.components.feedback.AppErrorState
import com.fab.wab.merchant.designsystem.components.feedback.AppLoadingIndicator
import com.fab.wab.merchant.designsystem.components.layout.AppPullToRefresh
import com.fab.wab.merchant.designsystem.components.layout.AppScreen
import com.fab.wab.merchant.designsystem.components.navigation.AppTopBar
import com.fab.wab.merchant.designsystem.components.text.AppText
import com.fab.wab.merchant.designsystem.icons.AppIcons
import com.fab.wab.merchant.designsystem.theme.AppTheme
import com.fab.wab.merchant.feature.salon.domain.Subscription
import com.fab.wab.merchant.feature.salon.domain.SubscriptionStatus
import com.fab.wab.merchant.feature.salon.presentation.analytics.SalonAnalytics
import com.fab.wab.merchant.feature.salon.presentation.controller.contract.ContactReason
import com.fab.wab.merchant.feature.salon.presentation.controller.contract.SubscriptionContract.UiAction
import com.fab.wab.merchant.feature.salon.presentation.controller.contract.SubscriptionContract.UiState
import com.fab.wab.merchant.feature.salon.presentation.resources.Res
import com.fab.wab.merchant.feature.salon.presentation.resources.sub_active
import com.fab.wab.merchant.feature.salon.presentation.resources.sub_badge_active
import com.fab.wab.merchant.feature.salon.presentation.resources.sub_badge_expired
import com.fab.wab.merchant.feature.salon.presentation.resources.sub_badge_trial
import com.fab.wab.merchant.feature.salon.presentation.resources.sub_cta_activate
import com.fab.wab.merchant.feature.salon.presentation.resources.sub_cta_contact
import com.fab.wab.merchant.feature.salon.presentation.resources.sub_cta_renew
import com.fab.wab.merchant.feature.salon.presentation.resources.sub_days_left
import com.fab.wab.merchant.feature.salon.presentation.resources.sub_ending_soon
import com.fab.wab.merchant.feature.salon.presentation.resources.sub_expired
import com.fab.wab.merchant.feature.salon.presentation.resources.sub_expired_on
import com.fab.wab.merchant.feature.salon.presentation.resources.sub_featured
import com.fab.wab.merchant.feature.salon.presentation.resources.sub_featured_note
import com.fab.wab.merchant.feature.salon.presentation.resources.sub_featured_sub
import com.fab.wab.merchant.feature.salon.presentation.resources.sub_paid_outside
import com.fab.wab.merchant.feature.salon.presentation.resources.sub_renews
import com.fab.wab.merchant.feature.salon.presentation.resources.sub_salon_state
import com.fab.wab.merchant.feature.salon.presentation.resources.sub_state_incomplete
import com.fab.wab.merchant.feature.salon.presentation.resources.sub_state_live
import com.fab.wab.merchant.feature.salon.presentation.resources.sub_state_offline
import com.fab.wab.merchant.feature.salon.presentation.resources.sub_subscription
import com.fab.wab.merchant.feature.salon.presentation.resources.sub_title
import com.fab.wab.merchant.feature.salon.presentation.resources.sub_trial
import com.fab.wab.merchant.feature.salon.presentation.resources.sub_trial_ends
import org.jetbrains.compose.resources.pluralStringResource
import org.jetbrains.compose.resources.stringResource

/** PRD M23 (design 08 `on.sub`). */
@Composable
fun SubscriptionScreen(state: UiState, onAction: (UiAction) -> Unit, onBack: () -> Unit, modifier: Modifier = Modifier) {
    TrackScreen(SalonAnalytics.SCREEN_SUBSCRIPTION)
    val spacing = AppTheme.spacing
    AppScreen(modifier = modifier, topBar = { AppTopBar(title = stringResource(Res.string.sub_title), onBack = onBack) }) { padding ->
        val subscription = state.subscription
        when {
            state.loading -> Box(Modifier.fillMaxSize(), contentAlignment = Alignment.Center) { AppLoadingIndicator() }
            subscription == null -> AppErrorState(onRetry = { onAction(UiAction.OnRetry) }, message = state.error)
            else -> AppPullToRefresh(
                refreshing = state.refreshing,
                onRefresh = { onAction(UiAction.OnRefresh) },
                modifier = Modifier.padding(padding),
            ) {
                Column(
                    modifier = Modifier.fillMaxSize().verticalScroll(rememberScrollState()).padding(spacing.space16),
                    verticalArrangement = Arrangement.spacedBy(spacing.space14),
                ) {
                    subscription.salonState?.let { StateCard(it) }
                    SubscriptionCard(subscription)
                    AppText(
                        text = stringResource(Res.string.sub_paid_outside),
                        style = AppTheme.typography.bodySmall,
                        color = AppTheme.colors.muted,
                    )
                    AppButton(
                        text = stringResource(
                            when (subscription.status) {
                                SubscriptionStatus.TRIAL -> Res.string.sub_cta_activate
                                SubscriptionStatus.EXPIRED -> Res.string.sub_cta_renew
                                SubscriptionStatus.ACTIVE -> Res.string.sub_cta_contact
                            },
                        ),
                        onClick = { onAction(UiAction.OnContact(ContactReason.SUBSCRIPTION)) },
                        modifier = Modifier.fillMaxWidth(),
                    )
                    FeaturedCard { onAction(UiAction.OnContact(ContactReason.FEATURED)) }
                }
            }
        }
    }
    state.contactSheet?.let { reason ->
        val contact = state.contact
        AppContactSheet(
            onDismiss = { onAction(UiAction.OnDismissContact) },
            onCall = contact?.phone?.takeIf { it.isNotBlank() }?.let { { onAction(UiAction.OnCall) } },
            onWhatsApp = contact?.whatsapp?.takeIf { it.isNotBlank() }?.let { { onAction(UiAction.OnWhatsApp) } },
            onEmail = contact?.email?.takeIf { it.isNotBlank() }?.let { { onAction(UiAction.OnEmail) } },
            note = if (reason == ContactReason.FEATURED) stringResource(Res.string.sub_featured_note) else null,
        )
    }
}

@Composable
private fun StateCard(state: SalonState) {
    val hint = when (state) {
        SalonState.LIVE -> Res.string.sub_state_live
        SalonState.OFFLINE -> Res.string.sub_state_offline
        else -> Res.string.sub_state_incomplete
    }
    AppCard(modifier = Modifier.fillMaxWidth()) {
        Column(verticalArrangement = Arrangement.spacedBy(AppTheme.spacing.space6)) {
            AppText(
                text = stringResource(Res.string.sub_salon_state),
                style = AppTheme.typography.labelLarge,
                color = AppTheme.colors.muted,
            )
            AppSalonStateChip(state, salonStateLabel(state))
            AppText(text = stringResource(hint), style = AppTheme.typography.bodySmall)
        }
    }
}

@Composable
private fun SubscriptionCard(subscription: Subscription) {
    val date = subscription.endsAt?.let { TimeFormat.isoDateText(it) }
    val (title, badge, tone) = when (subscription.status) {
        SubscriptionStatus.TRIAL -> Triple(Res.string.sub_trial, Res.string.sub_badge_trial, StatusTone.Warning)
        SubscriptionStatus.ACTIVE -> Triple(Res.string.sub_active, Res.string.sub_badge_active, StatusTone.Success)
        SubscriptionStatus.EXPIRED -> Triple(Res.string.sub_expired, Res.string.sub_badge_expired, StatusTone.Danger)
    }
    AppCard(modifier = Modifier.fillMaxWidth()) {
        Column(verticalArrangement = Arrangement.spacedBy(AppTheme.spacing.space6)) {
            Row(verticalAlignment = Alignment.CenterVertically) {
                AppText(
                    text = stringResource(Res.string.sub_subscription),
                    style = AppTheme.typography.labelLarge,
                    color = AppTheme.colors.muted,
                    modifier = Modifier.weight(1f),
                )
                AppStatusBadge(text = stringResource(badge), tone = tone)
            }
            AppText(text = stringResource(title), style = AppTheme.typography.titleMedium.copy(fontWeight = FontWeight.Bold))
            if (subscription.status != SubscriptionStatus.EXPIRED) {
                AppText(
                    text = pluralStringResource(Res.plurals.sub_days_left, subscription.daysRemaining, subscription.daysRemaining),
                    style = AppTheme.typography.bodyMedium,
                )
            }
            date?.let {
                val line = when (subscription.status) {
                    SubscriptionStatus.TRIAL -> Res.string.sub_trial_ends
                    SubscriptionStatus.ACTIVE -> Res.string.sub_renews
                    SubscriptionStatus.EXPIRED -> Res.string.sub_expired_on
                }
                AppText(text = stringResource(line, it), style = AppTheme.typography.bodySmall, color = AppTheme.colors.muted)
            }
            if (subscription.endingSoon && subscription.status != SubscriptionStatus.EXPIRED) {
                AppStatusBadge(text = stringResource(Res.string.sub_ending_soon), tone = StatusTone.Warning)
            }
        }
    }
}

@Composable
private fun FeaturedCard(onClick: () -> Unit) {
    AppCard(modifier = Modifier.fillMaxWidth(), onClick = onClick) {
        Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(AppTheme.spacing.space10)) {
            Icon(AppIcons.Crown, contentDescription = null, tint = AppTheme.colors.accent)
            Column(modifier = Modifier.weight(1f)) {
                AppText(text = stringResource(Res.string.sub_featured), style = AppTheme.typography.bodyLarge)
                AppText(
                    text = stringResource(Res.string.sub_featured_sub),
                    style = AppTheme.typography.bodySmall,
                    color = AppTheme.colors.muted,
                )
            }
            Icon(AppIcons.Forward, contentDescription = null, tint = AppTheme.colors.faint)
        }
    }
}
