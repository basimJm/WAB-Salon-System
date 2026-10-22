package com.fab.wab.customer.feature.salon.presentation.screen

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.ExperimentalLayoutApi
import androidx.compose.foundation.layout.FlowRow
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.verticalScroll
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import com.fab.wab.customer.core.analytics.compose.TrackScreen
import com.fab.wab.customer.core.domain.salon.MemberRole
import com.fab.wab.customer.core.domain.salon.StaffMember
import com.fab.wab.customer.core.domain.salon.StaffStatus
import com.fab.wab.customer.designsystem.components.avatar.AppAvatar
import com.fab.wab.customer.designsystem.components.dialog.AppFullScreenSheet
import com.fab.wab.customer.designsystem.components.dialog.AppGlobalDialog
import com.fab.wab.customer.designsystem.components.dialog.GlobalDialogKind
import com.fab.wab.customer.designsystem.components.domain.ratingValueText
import com.fab.wab.customer.designsystem.components.feedback.AppContentState
import com.fab.wab.customer.designsystem.components.feedback.AppOfflineState
import com.fab.wab.customer.designsystem.components.feedback.contentStateOf
import com.fab.wab.customer.designsystem.components.shimmer.AppShimmerBox
import com.fab.wab.customer.designsystem.components.text.AppText
import com.fab.wab.customer.designsystem.resources.Res as CoreRes
import com.fab.wab.customer.designsystem.resources.staff_on_duty
import com.fab.wab.customer.designsystem.resources.staff_on_leave
import com.fab.wab.customer.designsystem.resources.state_error_title
import com.fab.wab.customer.designsystem.theme.AppTheme
import com.fab.wab.customer.designsystem.utils.softShadow
import com.fab.wab.customer.feature.salon.presentation.analytics.SalonAnalytics
import com.fab.wab.customer.feature.salon.presentation.controller.contract.StaffSheetContract.UiAction
import com.fab.wab.customer.feature.salon.presentation.controller.contract.StaffSheetContract.UiState
import com.fab.wab.customer.feature.salon.presentation.resources.Res
import com.fab.wab.customer.feature.salon.presentation.resources.salon_error_body
import com.fab.wab.customer.feature.salon.presentation.resources.salon_retry
import com.fab.wab.customer.feature.salon.presentation.resources.staff_customers_label
import com.fab.wab.customer.feature.salon.presentation.resources.staff_day_off_status
import com.fab.wab.customer.feature.salon.presentation.resources.staff_profile_title
import com.fab.wab.customer.feature.salon.presentation.resources.staff_rating_label
import com.fab.wab.customer.feature.salon.presentation.resources.staff_rating_value
import com.fab.wab.customer.feature.salon.presentation.resources.staff_role_employee
import com.fab.wab.customer.feature.salon.presentation.resources.staff_role_manager
import com.fab.wab.customer.feature.salon.presentation.resources.staff_role_owner
import com.fab.wab.customer.feature.salon.presentation.resources.staff_years_label
import org.jetbrains.compose.resources.stringResource

/** S07a full-screen staff sheet: close + centered title, loading placeholder, profile, stats, days, services, reviews. */
@Composable
fun StaffSheet(state: UiState, onAction: (UiAction) -> Unit, onDismiss: () -> Unit, modifier: Modifier = Modifier) {
    TrackScreen(SalonAnalytics.STAFF_SCREEN)
    AppFullScreenSheet(title = stringResource(Res.string.staff_profile_title), onClose = onDismiss, modifier = modifier) {
        val content = contentStateOf(state.loading, state.offline, state.error, isEmpty = false, hasContent = state.member != null)
        when (content) {
            AppContentState.Loading -> StaffShimmer()
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
            else -> state.member?.let { StaffBody(it, onAction) }
        }
    }
    if (state.authDialog) {
        AppGlobalDialog(
            kind = GlobalDialogKind.AuthRequired,
            onConfirm = { onAction(UiAction.OnDialogConfirm) },
            onDismiss = { onAction(UiAction.OnDialogDismiss) },
        )
    }
}

@Composable
private fun StaffShimmer() {
    val spacing = AppTheme.spacing
    Column(
        modifier = Modifier.fillMaxWidth().padding(spacing.space20),
        horizontalAlignment = Alignment.CenterHorizontally,
        verticalArrangement = Arrangement.spacedBy(spacing.space12),
    ) {
        Box(Modifier.size(SalonDesign.staffSheetAvatar).background(AppTheme.colors.shimmerBase, AppTheme.shapes.circle))
        AppShimmerBox(Modifier.width(SalonDesign.staffShimmerName).height(SalonDesign.staffShimmerNameHeight), shape = AppTheme.shapes.pill)
        AppShimmerBox(Modifier.fillMaxWidth().height(SalonDesign.staffShimmerBlock), shape = AppTheme.shapes.large)
        AppShimmerBox(Modifier.fillMaxWidth().height(SalonDesign.staffShimmerTall), shape = AppTheme.shapes.large)
    }
}

@OptIn(ExperimentalLayoutApi::class)
@Composable
private fun StaffBody(member: StaffMember, onAction: (UiAction) -> Unit) {
    val spacing = AppTheme.spacing
    Column(
        modifier = Modifier
            .fillMaxSize()
            .verticalScroll(rememberScrollState())
            .padding(top = spacing.space4, start = spacing.space20, end = spacing.space20, bottom = SalonDesign.sheetBottom),
    ) {
        Column(
            modifier = Modifier.fillMaxWidth(),
            horizontalAlignment = Alignment.CenterHorizontally,
            verticalArrangement = Arrangement.spacedBy(spacing.space6),
        ) {
            AppAvatar(
                name = member.firstName,
                imageUrl = member.photoUrl,
                size = SalonDesign.staffSheetAvatar,
                modifier = Modifier.softShadow(
                    SalonDesign.staffAvatarShadow,
                    AppTheme.colors.accent.copy(alpha = SalonDesign.STAFF_AVATAR_SHADOW_ALPHA),
                    AppTheme.shapes.circle,
                ),
            )
            AppText(
                text = member.firstName,
                style = AppTheme.typography.headlineMedium,
                textAlign = TextAlign.Center,
                modifier = Modifier.padding(top = spacing.space6),
            )
            FlowRow(
                horizontalArrangement = Arrangement.spacedBy(spacing.space6, Alignment.CenterHorizontally),
                verticalArrangement = Arrangement.spacedBy(spacing.space6),
            ) {
                StaffChip(text = stringResource(member.role.labelRes()), container = AppTheme.colors.soft, content = AppTheme.colors.accent)
                StatusBadge(member.status)
            }
        }
        StatsGrid(member)
        member.bio?.let {
            AppText(
                text = it,
                style = AppTheme.typography.bodyMedium,
                color = AppTheme.colors.muted,
                modifier = Modifier.padding(bottom = SalonDesign.statGridVertical),
            )
        }
        WorkingDaysSection(member)
        StaffServicesSection(member)
        StaffReviews(member, onAction)
    }
}

@Composable
private fun StatusBadge(status: StaffStatus) {
    val (res, positive) = when (status) {
        StaffStatus.ON_DUTY -> CoreRes.string.staff_on_duty to true
        StaffStatus.ON_LEAVE -> CoreRes.string.staff_on_leave to false
        StaffStatus.DAY_OFF -> Res.string.staff_day_off_status to false
    }
    SalonStatusBadge(text = stringResource(res), positive = positive, withDot = false)
}

/** Three surface cells: years of experience, customers through the app, `★ 4.9`. */
@Composable
private fun StatsGrid(member: StaffMember) {
    val spacing = AppTheme.spacing
    Row(
        modifier = Modifier.fillMaxWidth().padding(vertical = SalonDesign.statGridVertical),
        horizontalArrangement = Arrangement.spacedBy(spacing.space8),
    ) {
        member.yearsOfExperience?.let { StatCell(it.toString(), stringResource(Res.string.staff_years_label), Modifier.weight(1f)) }
        StatCell(member.customersCount.toString(), stringResource(Res.string.staff_customers_label), Modifier.weight(1f))
        StatCell(
            value = stringResource(Res.string.staff_rating_value, ratingValueText(member.rating.average)),
            label = stringResource(Res.string.staff_rating_label),
            modifier = Modifier.weight(1f),
        )
    }
}

@Composable
private fun StatCell(value: String, label: String, modifier: Modifier = Modifier) {
    Column(
        modifier = modifier
            .background(AppTheme.colors.surface, AppTheme.shapes.medium)
            .padding(horizontal = AppTheme.spacing.space6, vertical = AppTheme.spacing.space12),
        horizontalAlignment = Alignment.CenterHorizontally,
        verticalArrangement = Arrangement.spacedBy(AppTheme.spacing.space2),
    ) {
        AppText(
            text = value,
            style = AppTheme.typography.titleMedium.copy(fontWeight = FontWeight.Bold),
            color = AppTheme.colors.accent,
            maxLines = 1,
            textAlign = TextAlign.Center,
        )
        AppText(text = label, style = AppTheme.typography.labelSmall, color = AppTheme.colors.muted, textAlign = TextAlign.Center)
    }
}

private fun MemberRole.labelRes() = when (this) {
    MemberRole.OWNER -> Res.string.staff_role_owner
    MemberRole.MANAGER -> Res.string.staff_role_manager
    MemberRole.EMPLOYEE -> Res.string.staff_role_employee
}
