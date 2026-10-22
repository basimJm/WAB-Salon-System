package com.fab.wab.customer.feature.salon.presentation.screen

import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.ExperimentalLayoutApi
import androidx.compose.foundation.layout.FlowRow
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.runtime.Composable
import androidx.compose.runtime.remember
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.drawBehind
import androidx.compose.ui.geometry.CornerRadius
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.PathEffect
import androidx.compose.ui.graphics.drawscope.Stroke
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextDecoration
import com.fab.wab.customer.core.domain.salon.DayOfWeek
import com.fab.wab.customer.core.domain.salon.StaffMember
import com.fab.wab.customer.designsystem.components.text.AppText
import com.fab.wab.customer.designsystem.theme.AppTheme
import com.fab.wab.customer.feature.salon.presentation.controller.contract.StaffSheetContract.UiAction
import com.fab.wab.customer.feature.salon.presentation.resources.Res
import com.fab.wab.customer.feature.salon.presentation.resources.salon_reviews
import com.fab.wab.customer.feature.salon.presentation.resources.staff_no_reviews
import com.fab.wab.customer.feature.salon.presentation.resources.staff_services
import com.fab.wab.customer.feature.salon.presentation.resources.staff_working_days
import org.jetbrains.compose.resources.stringResource

/** Small bold pill (`11.5px/700`, padding `4 10`, radius 8) used for the role and the bride badge. */
@Composable
internal fun StaffChip(text: String, container: Color, content: Color, modifier: Modifier = Modifier) {
    AppText(
        text = text,
        style = AppTheme.typography.labelSmall.copy(fontWeight = FontWeight.Bold),
        color = content,
        maxLines = 1,
        modifier = modifier
            .background(container, AppTheme.shapes.small)
            .padding(horizontal = AppTheme.spacing.space10, vertical = AppTheme.spacing.space4),
    )
}

@Composable
private fun SheetSectionTitle(text: String, modifier: Modifier = Modifier) {
    AppText(
        text = text,
        style = AppTheme.typography.titleSmall.copy(fontWeight = FontWeight.Bold),
        modifier = modifier.padding(bottom = AppTheme.spacing.space10),
    )
}

/** All seven days: working ones as soft accent chips, the others faint, dashed and struck through. */
@OptIn(ExperimentalLayoutApi::class)
@Composable
internal fun WorkingDaysSection(member: StaffMember, modifier: Modifier = Modifier) {
    if (member.workingDays.isEmpty()) return
    val working = remember(member) { member.workingDays.mapNotNull { it.day }.toSet() }
    Column(modifier) {
        SheetSectionTitle(stringResource(Res.string.staff_working_days))
        FlowRow(
            modifier = Modifier.fillMaxWidth().padding(bottom = SalonDesign.statGridVertical),
            horizontalArrangement = Arrangement.spacedBy(AppTheme.spacing.space6),
            verticalArrangement = Arrangement.spacedBy(AppTheme.spacing.space6),
        ) {
            DayOfWeek.entries.forEach { day -> DayChip(stringResource(day.nameRes()), isWorking = day in working) }
        }
    }
}

@Composable
private fun DayChip(text: String, isWorking: Boolean) {
    val colors = AppTheme.colors
    val shape = remember { RoundedCornerShape(SalonDesign.dayChipRadius) }
    val hairline = AppTheme.sizes.hairline
    val decoration = if (isWorking) Modifier.background(colors.soft, shape) else Modifier.drawBehind {
        drawRoundRect(
            color = colors.line,
            cornerRadius = CornerRadius(SalonDesign.dayChipRadius.toPx()),
            style = Stroke(
                width = hairline.toPx(),
                pathEffect = PathEffect.dashPathEffect(floatArrayOf(SalonDesign.DASH_LENGTH, SalonDesign.DASH_GAP)),
            ),
        )
    }
    AppText(
        text = text,
        style = AppTheme.typography.labelMedium.copy(textDecoration = if (isWorking) null else TextDecoration.LineThrough),
        color = if (isWorking) colors.accent else colors.faint,
        maxLines = 1,
        modifier = decoration.padding(horizontal = SalonDesign.dayChipPaddingH, vertical = SalonDesign.dayChipPaddingV),
    )
}

/** Outlined chips (`12.5px`, padding `7 12`, radius 16) with the services the member provides. */
@OptIn(ExperimentalLayoutApi::class)
@Composable
internal fun StaffServicesSection(member: StaffMember, modifier: Modifier = Modifier) {
    if (member.services.isEmpty()) return
    Column(modifier) {
        SheetSectionTitle(stringResource(Res.string.staff_services))
        FlowRow(
            modifier = Modifier.fillMaxWidth().padding(bottom = AppTheme.spacing.space20),
            horizontalArrangement = Arrangement.spacedBy(AppTheme.spacing.space6),
            verticalArrangement = Arrangement.spacedBy(AppTheme.spacing.space6),
        ) {
            member.services.forEach { service ->
                AppText(
                    text = service.name,
                    style = AppTheme.typography.bodySmall,
                    maxLines = 1,
                    modifier = Modifier
                        .border(AppTheme.sizes.hairline, AppTheme.colors.line, AppTheme.shapes.large)
                        .padding(horizontal = SalonDesign.serviceChipPaddingH, vertical = SalonDesign.serviceChipPaddingV),
                )
            }
        }
    }
}

/** Staff ratings are independent of the salon rating (PRD S07 acceptance): header, 3 compact cards, actions. */
@Composable
internal fun StaffReviews(member: StaffMember, onAction: (UiAction) -> Unit, modifier: Modifier = Modifier) {
    val spacing = AppTheme.spacing
    val summary = member.reviews.summary
    val hasReviews = summary.count > 0 && member.reviews.latest.isNotEmpty()
    Column(modifier) {
        Row(
            modifier = Modifier.fillMaxWidth().padding(bottom = spacing.space10),
            horizontalArrangement = Arrangement.SpaceBetween,
            verticalAlignment = Alignment.CenterVertically,
        ) {
            AppText(
                text = stringResource(Res.string.salon_reviews),
                style = AppTheme.typography.titleSmall.copy(fontWeight = FontWeight.Bold),
            )
            if (hasReviews) {
                AppText(
                    text = reviewSummaryText(summary, withReviewsWord = false),
                    style = AppTheme.typography.bodySmall,
                    color = AppTheme.colors.muted,
                )
            }
        }
        Column(verticalArrangement = Arrangement.spacedBy(spacing.space8)) {
            if (hasReviews) {
                member.reviews.latest.take(SalonDesign.REVIEW_PREVIEW_COUNT).forEach { SalonReviewCard(it, ReviewCardStyle.StaffPreview) }
            } else {
                NoReviewsBox(stringResource(Res.string.staff_no_reviews), compact = true)
            }
        }
        ReviewActionsRow(
            hasReviews = hasReviews,
            onSeeAll = { onAction(UiAction.OnAllReviewsClick) },
            onAdd = { onAction(UiAction.OnAddReviewClick) },
            modifier = Modifier.padding(top = spacing.space12),
        )
    }
}
