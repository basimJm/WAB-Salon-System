package com.fab.wab.customer.feature.salon.presentation.screen

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.ExperimentalLayoutApi
import androidx.compose.foundation.layout.FlowRow
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxHeight
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.verticalScroll
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import com.fab.wab.customer.core.analytics.compose.TrackScreen
import com.fab.wab.customer.core.domain.salon.MemberRole
import com.fab.wab.customer.core.domain.salon.StaffMember
import com.fab.wab.customer.core.domain.salon.StaffStatus
import com.fab.wab.customer.designsystem.components.avatar.AppAvatar
import com.fab.wab.customer.designsystem.components.badge.AppStatusBadge
import com.fab.wab.customer.designsystem.components.badge.StatusTone
import com.fab.wab.customer.designsystem.components.button.AppTextButton
import com.fab.wab.customer.designsystem.components.chip.AppFilterChip
import com.fab.wab.customer.designsystem.components.dialog.AppBottomSheet
import com.fab.wab.customer.designsystem.components.dialog.AppGlobalDialog
import com.fab.wab.customer.designsystem.components.dialog.GlobalDialogKind
import com.fab.wab.customer.designsystem.components.domain.AppReviewItem
import com.fab.wab.customer.designsystem.components.domain.ratingValueText
import com.fab.wab.customer.designsystem.components.feedback.AppStateContent
import com.fab.wab.customer.designsystem.components.feedback.contentStateOf
import com.fab.wab.customer.designsystem.components.rating.AppRatingStars
import com.fab.wab.customer.designsystem.components.section.AppSectionHeader
import com.fab.wab.customer.designsystem.components.shimmer.AppShimmerList
import com.fab.wab.customer.designsystem.components.text.AppText
import com.fab.wab.customer.designsystem.resources.Res as CoreRes
import com.fab.wab.customer.designsystem.resources.staff_on_duty
import com.fab.wab.customer.designsystem.resources.staff_on_leave
import com.fab.wab.customer.designsystem.theme.AppTheme
import com.fab.wab.customer.feature.salon.presentation.analytics.SalonAnalytics
import com.fab.wab.customer.feature.salon.presentation.controller.contract.StaffSheetContract.UiAction
import com.fab.wab.customer.feature.salon.presentation.controller.contract.StaffSheetContract.UiState
import com.fab.wab.customer.feature.salon.presentation.resources.Res
import com.fab.wab.customer.feature.salon.presentation.resources.salon_day_off
import com.fab.wab.customer.feature.salon.presentation.resources.salon_review_add
import com.fab.wab.customer.feature.salon.presentation.resources.salon_reviews
import com.fab.wab.customer.feature.salon.presentation.resources.salon_reviews_all
import com.fab.wab.customer.feature.salon.presentation.resources.salon_reviews_summary
import com.fab.wab.customer.feature.salon.presentation.resources.staff_customers
import com.fab.wab.customer.feature.salon.presentation.resources.staff_day_off_status
import com.fab.wab.customer.feature.salon.presentation.resources.staff_experience
import com.fab.wab.customer.feature.salon.presentation.resources.staff_no_reviews
import com.fab.wab.customer.feature.salon.presentation.resources.staff_role_employee
import com.fab.wab.customer.feature.salon.presentation.resources.staff_role_manager
import com.fab.wab.customer.feature.salon.presentation.resources.staff_role_owner
import com.fab.wab.customer.feature.salon.presentation.resources.staff_services
import com.fab.wab.customer.feature.salon.presentation.resources.staff_working_days
import org.jetbrains.compose.resources.stringResource

/** S07a full-screen staff sheet. */
@Composable
fun StaffSheet(state: UiState, onAction: (UiAction) -> Unit, onDismiss: () -> Unit, modifier: Modifier = Modifier) {
    TrackScreen(SalonAnalytics.STAFF_SCREEN)
    AppBottomSheet(onDismiss = onDismiss, modifier = modifier) {
        AppStateContent(
            state = contentStateOf(state.loading, state.offline, state.error, isEmpty = false, hasContent = state.member != null),
            onRetry = { onAction(UiAction.OnRetry) },
            modifier = Modifier.fillMaxHeight(SHEET_HEIGHT_FRACTION),
            loading = { AppShimmerList(Modifier.padding(AppTheme.spacing.space16), circularImage = true) },
        ) {
            state.member?.let { StaffBody(it, onAction) }
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

@OptIn(ExperimentalLayoutApi::class)
@Composable
private fun StaffBody(member: StaffMember, onAction: (UiAction) -> Unit) {
    val spacing = AppTheme.spacing
    Column(
        modifier = Modifier.fillMaxWidth().verticalScroll(rememberScrollState()).padding(spacing.space16),
        verticalArrangement = Arrangement.spacedBy(spacing.space16),
    ) {
        Column(modifier = Modifier.fillMaxWidth(), horizontalAlignment = Alignment.CenterHorizontally) {
            AppAvatar(name = member.firstName, imageUrl = member.photoUrl, size = AppTheme.sizes.avatarLarge)
            AppText(text = member.firstName, style = AppTheme.typography.headlineSmall)
            Row(horizontalArrangement = Arrangement.spacedBy(spacing.space8), verticalAlignment = Alignment.CenterVertically) {
                AppStatusBadge(text = stringResource(member.role.labelRes()), tone = StatusTone.Accent)
                StatusBadge(member.status)
            }
            Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(spacing.space4)) {
                AppRatingStars(rating = member.rating.average)
                AppText(text = ratingValueText(member.rating.average), color = AppTheme.colors.muted)
            }
        }
        member.bio?.let { AppText(text = it) }
        member.yearsOfExperience?.let { AppText(text = stringResource(Res.string.staff_experience, it), color = AppTheme.colors.muted) }
        AppText(text = stringResource(Res.string.staff_customers, member.customersCount), color = AppTheme.colors.muted)
        if (member.workingDays.isNotEmpty()) {
            AppSectionHeader(title = stringResource(Res.string.staff_working_days))
            member.workingDays.forEach { day ->
                Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween) {
                    AppText(text = day.day?.let { stringResource(it.nameRes()) }.orEmpty())
                    AppText(text = day.hours?.text() ?: stringResource(Res.string.salon_day_off), color = AppTheme.colors.muted)
                }
            }
        }
        if (member.services.isNotEmpty()) {
            AppSectionHeader(title = stringResource(Res.string.staff_services))
            FlowRow(
                horizontalArrangement = Arrangement.spacedBy(spacing.space8),
                verticalArrangement = Arrangement.spacedBy(spacing.space8),
            ) {
                member.services.forEach { AppFilterChip(text = it.name, selected = false, onClick = {}) }
            }
        }
        StaffReviews(member, onAction)
    }
}

@Composable
private fun StatusBadge(status: StaffStatus) {
    val (res, tone) = when (status) {
        StaffStatus.ON_DUTY -> CoreRes.string.staff_on_duty to StatusTone.Success
        StaffStatus.ON_LEAVE -> CoreRes.string.staff_on_leave to StatusTone.Warning
        StaffStatus.DAY_OFF -> Res.string.staff_day_off_status to StatusTone.Neutral
    }
    AppStatusBadge(text = stringResource(res), tone = tone)
}

/** Staff ratings are independent of the salon rating (PRD S07 acceptance). */
@Composable
private fun StaffReviews(member: StaffMember, onAction: (UiAction) -> Unit) {
    val summary = member.reviews.summary
    Column(verticalArrangement = Arrangement.spacedBy(AppTheme.spacing.space12)) {
        Row(modifier = Modifier.fillMaxWidth(), verticalAlignment = Alignment.CenterVertically) {
            AppSectionHeader(title = stringResource(Res.string.salon_reviews), modifier = Modifier.weight(1f))
            if (summary.count > 0) {
                AppText(
                    text = stringResource(Res.string.salon_reviews_summary, ratingValueText(summary.average), summary.count),
                    color = AppTheme.colors.muted,
                    style = AppTheme.typography.bodySmall,
                )
            }
        }
        if (member.reviews.latest.isEmpty()) {
            AppText(text = stringResource(Res.string.staff_no_reviews), color = AppTheme.colors.muted)
        } else {
            member.reviews.latest.take(REVIEW_PREVIEW_COUNT).forEach { AppReviewItem(review = it.toUi()) }
        }
        Row(horizontalArrangement = Arrangement.spacedBy(AppTheme.spacing.space8)) {
            if (summary.count > 0) {
                AppTextButton(text = stringResource(Res.string.salon_reviews_all), onClick = { onAction(UiAction.OnAllReviewsClick) })
            }
            AppTextButton(text = stringResource(Res.string.salon_review_add), onClick = { onAction(UiAction.OnAddReviewClick) })
        }
    }
}

private fun MemberRole.labelRes() = when (this) {
    MemberRole.OWNER -> Res.string.staff_role_owner
    MemberRole.MANAGER -> Res.string.staff_role_manager
    MemberRole.EMPLOYEE -> Res.string.staff_role_employee
}

private const val SHEET_HEIGHT_FRACTION = 0.95f
private const val REVIEW_PREVIEW_COUNT = 3
