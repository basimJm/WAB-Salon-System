package com.fab.wab.customer.feature.salon.presentation.screen

import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.Icon
import androidx.compose.runtime.Composable
import androidx.compose.runtime.remember
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.draw.rotate
import androidx.compose.ui.semantics.Role
import androidx.compose.ui.text.font.FontWeight
import com.fab.wab.customer.core.domain.salon.Closure
import com.fab.wab.customer.core.domain.salon.DaySchedule
import com.fab.wab.customer.core.domain.salon.SalonDetails
import com.fab.wab.customer.designsystem.components.divider.AppDivider
import com.fab.wab.customer.designsystem.components.text.AppExpandableText
import com.fab.wab.customer.designsystem.components.text.AppText
import com.fab.wab.customer.designsystem.icons.AppIcons
import com.fab.wab.customer.designsystem.theme.AppTheme
import com.fab.wab.customer.feature.salon.presentation.controller.contract.SalonDetailsContract.UiAction
import com.fab.wab.customer.feature.salon.presentation.resources.Res
import com.fab.wab.customer.feature.salon.presentation.resources.salon_call
import com.fab.wab.customer.feature.salon.presentation.resources.salon_closed
import com.fab.wab.customer.feature.salon.presentation.resources.salon_closure
import com.fab.wab.customer.feature.salon.presentation.resources.salon_closure_title
import com.fab.wab.customer.feature.salon.presentation.resources.salon_day_off
import com.fab.wab.customer.feature.salon.presentation.resources.salon_day_today
import com.fab.wab.customer.feature.salon.presentation.resources.salon_desc_less
import com.fab.wab.customer.feature.salon.presentation.resources.salon_desc_more
import com.fab.wab.customer.feature.salon.presentation.resources.salon_hours_title
import com.fab.wab.customer.feature.salon.presentation.resources.salon_whatsapp
import org.jetbrains.compose.resources.stringResource

/** Call always (when a phone exists); WhatsApp only when the salon has one (PRD S07 item 5). Two 48 px outlined buttons. */
@Composable
internal fun ContactRow(salon: SalonDetails, onAction: (UiAction) -> Unit) {
    if (salon.phone == null && salon.whatsapp == null) return
    Row(
        modifier = Modifier
            .fillMaxWidth()
            .padding(top = AppTheme.spacing.space12, start = AppTheme.spacing.space20, end = AppTheme.spacing.space20),
        horizontalArrangement = Arrangement.spacedBy(AppTheme.spacing.space10),
    ) {
        salon.phone?.let {
            SalonButton(
                text = stringResource(Res.string.salon_call),
                onClick = { onAction(UiAction.OnCallClick) },
                modifier = Modifier.weight(1f),
                height = SalonDesign.contactButtonHeight,
                leadingIcon = AppIcons.Call,
            )
        }
        salon.whatsapp?.let {
            SalonButton(
                text = stringResource(Res.string.salon_whatsapp),
                onClick = { onAction(UiAction.OnWhatsAppClick) },
                modifier = Modifier.weight(1f),
                height = SalonDesign.contactButtonHeight,
                leadingIcon = AppIcons.Chat,
                iconTint = AppTheme.colors.success,
            )
        }
    }
}

/** Muted description clamped to 3 lines with the accent "See more / Show less" toggle. */
@Composable
internal fun Description(salon: SalonDetails) {
    val text = salon.description ?: return
    AppExpandableText(
        text = text,
        collapsedLines = SalonDesign.DESCRIPTION_LINES,
        moreLabel = stringResource(Res.string.salon_desc_more),
        lessLabel = stringResource(Res.string.salon_desc_less),
        modifier = Modifier.padding(top = SalonDesign.descriptionTop, start = AppTheme.spacing.space20, end = AppTheme.spacing.space20),
    )
}

/** Bordered card: surface header (clock, title, today's hours, chevron) + the week and upcoming closures when expanded. */
@Composable
internal fun WorkingHoursCard(salon: SalonDetails, expanded: Boolean, onAction: (UiAction) -> Unit) {
    val colors = AppTheme.colors
    val spacing = AppTheme.spacing
    val shape = remember { RoundedCornerShape(SalonDesign.hoursCardRadius) }
    val todayLine = if (salon.isOpenNow) salon.todayHours?.text() else null
    Column(
        modifier = Modifier
            .fillMaxWidth()
            .padding(top = spacing.space10, start = spacing.space20, end = spacing.space20)
            .border(AppTheme.sizes.hairline, colors.line, shape)
            .clip(shape),
    ) {
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .background(colors.surface)
                .clickable(role = Role.Button) { onAction(UiAction.OnHoursToggle) }
                .padding(horizontal = spacing.space16, vertical = spacing.space14),
            verticalAlignment = Alignment.CenterVertically,
            horizontalArrangement = Arrangement.spacedBy(spacing.space10),
        ) {
            Icon(SalonIcons.Clock, contentDescription = null, tint = colors.accent, modifier = Modifier.size(SalonDesign.hoursIcon))
            AppText(
                text = stringResource(Res.string.salon_hours_title),
                style = AppTheme.typography.titleSmall.copy(fontWeight = FontWeight.Bold),
                modifier = Modifier.weight(1f),
            )
            AppText(
                text = todayLine ?: stringResource(Res.string.salon_closed),
                style = AppTheme.typography.bodySmall,
                color = colors.muted,
                maxLines = 1,
            )
            Icon(
                imageVector = AppIcons.ExpandMore,
                contentDescription = null,
                tint = colors.faint,
                modifier = Modifier.size(SalonDesign.hoursChevron).rotate(if (expanded) SalonDesign.CHEVRON_EXPANDED_ROTATION else 0f),
            )
        }
        if (expanded) {
            val today = remember { todayDayOfWeek() }
            Column(Modifier.padding(top = spacing.space6, start = spacing.space16, end = spacing.space16, bottom = spacing.space14)) {
                salon.weeklySchedule.forEach { day -> ScheduleRow(day, isToday = day.day == today) }
                salon.upcomingClosures.forEach { closure -> ClosureBox(closure) }
            }
        }
    }
}

@Composable
private fun ScheduleRow(day: DaySchedule, isToday: Boolean) {
    val colors = AppTheme.colors
    val typography = AppTheme.typography
    val dayName = day.day?.let { stringResource(it.nameRes()) }.orEmpty()
    Column {
        Row(
            modifier = Modifier.fillMaxWidth().padding(vertical = SalonDesign.hoursRowPadding),
            horizontalArrangement = Arrangement.SpaceBetween,
        ) {
            AppText(
                text = if (isToday) stringResource(Res.string.salon_day_today, dayName) else dayName,
                style = typography.bodySmall.copy(fontWeight = if (isToday) FontWeight.Bold else FontWeight.Medium),
                color = if (isToday) colors.accent else colors.ink,
            )
            AppText(
                text = if (day.isOff) stringResource(Res.string.salon_day_off) else day.hours?.text().orEmpty(),
                style = typography.bodySmall.copy(fontWeight = if (day.isOff) FontWeight.SemiBold else FontWeight.Normal),
                color = if (day.isOff) colors.danger else colors.muted,
            )
        }
        AppDivider()
    }
}

/** Rose-tinted box: calendar icon, bold "Upcoming closure", dates + reason. */
@Composable
private fun ClosureBox(closure: Closure) {
    val colors = AppTheme.colors
    val spacing = AppTheme.spacing
    val shape = remember { RoundedCornerShape(SalonDesign.closureRadius) }
    Row(
        modifier = Modifier
            .fillMaxWidth()
            .padding(top = spacing.space12)
            .background(colors.dangerContainer, shape)
            .padding(horizontal = spacing.space12, vertical = spacing.space10),
        horizontalArrangement = Arrangement.spacedBy(spacing.space10),
        verticalAlignment = Alignment.Top,
    ) {
        Icon(
            imageVector = SalonIcons.Closure,
            contentDescription = null,
            tint = colors.danger,
            modifier = Modifier.padding(top = spacing.space2).size(SalonDesign.closureIcon),
        )
        Column {
            AppText(
                text = stringResource(Res.string.salon_closure_title),
                style = AppTheme.typography.labelMedium.copy(fontWeight = FontWeight.Bold),
                color = colors.danger,
            )
            AppText(
                text = stringResource(Res.string.salon_closure, closure.from, closure.to, closure.reason),
                style = AppTheme.typography.bodySmall,
            )
        }
    }
}
