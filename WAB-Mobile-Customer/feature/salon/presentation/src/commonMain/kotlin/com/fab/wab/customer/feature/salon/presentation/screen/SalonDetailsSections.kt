package com.fab.wab.customer.feature.salon.presentation.screen

import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.size
import androidx.compose.material3.Icon
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.semantics.Role
import com.fab.wab.customer.core.domain.salon.SalonDetails
import com.fab.wab.customer.designsystem.components.badge.AppStatusBadge
import com.fab.wab.customer.designsystem.components.badge.StatusTone
import com.fab.wab.customer.designsystem.components.button.AppOutlinedButton
import com.fab.wab.customer.designsystem.components.section.AppSectionHeader
import com.fab.wab.customer.designsystem.components.text.AppExpandableText
import com.fab.wab.customer.designsystem.components.text.AppText
import com.fab.wab.customer.designsystem.icons.AppIcons
import com.fab.wab.customer.designsystem.resources.Res as CoreRes
import com.fab.wab.customer.designsystem.resources.salon_open
import com.fab.wab.customer.designsystem.theme.AppTheme
import com.fab.wab.customer.feature.salon.presentation.controller.contract.SalonDetailsContract.UiAction
import com.fab.wab.customer.feature.salon.presentation.resources.Res
import com.fab.wab.customer.feature.salon.presentation.resources.salon_call
import com.fab.wab.customer.feature.salon.presentation.resources.salon_closed
import com.fab.wab.customer.feature.salon.presentation.resources.salon_closure
import com.fab.wab.customer.feature.salon.presentation.resources.salon_day_off
import com.fab.wab.customer.feature.salon.presentation.resources.salon_hours_title
import com.fab.wab.customer.feature.salon.presentation.resources.salon_whatsapp
import org.jetbrains.compose.resources.stringResource

@Composable
internal fun StatusAndHours(salon: SalonDetails) {
    Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(AppTheme.spacing.space8)) {
        if (salon.isOpenNow) {
            AppStatusBadge(text = stringResource(CoreRes.string.salon_open), tone = StatusTone.Success)
        } else {
            AppStatusBadge(text = salon.closedReason ?: stringResource(Res.string.salon_closed), tone = StatusTone.Danger)
        }
        salon.todayHours?.text()?.let { AppText(text = it, color = AppTheme.colors.muted) }
    }
}

/** Tappable location text → maps chooser (PRD S07 item 4); hidden without a location text. */
@Composable
internal fun LocationRow(salon: SalonDetails, onAction: (UiAction) -> Unit) {
    val text = salon.locationText ?: return
    Row(
        modifier = Modifier.fillMaxWidth()
            .clickable(role = Role.Button, enabled = salon.location != null) { onAction(UiAction.OnLocationClick) },
        verticalAlignment = Alignment.CenterVertically,
        horizontalArrangement = Arrangement.spacedBy(AppTheme.spacing.space8),
    ) {
        Icon(AppIcons.Location, contentDescription = null, tint = AppTheme.colors.accent, modifier = Modifier.size(AppTheme.sizes.icon))
        AppText(text = text, color = AppTheme.colors.accent)
    }
}

/** Call always (when a phone exists); WhatsApp only when the salon has one (PRD S07 item 5). */
@Composable
internal fun ContactRow(salon: SalonDetails, onAction: (UiAction) -> Unit) {
    if (salon.phone == null && salon.whatsapp == null) return
    Row(horizontalArrangement = Arrangement.spacedBy(AppTheme.spacing.space12), modifier = Modifier.fillMaxWidth()) {
        salon.phone?.let {
            AppOutlinedButton(
                text = stringResource(Res.string.salon_call),
                onClick = { onAction(UiAction.OnCallClick) },
                modifier = Modifier.weight(1f),
                leadingIcon = AppIcons.Call,
            )
        }
        salon.whatsapp?.let {
            AppOutlinedButton(
                text = stringResource(Res.string.salon_whatsapp),
                onClick = { onAction(UiAction.OnWhatsAppClick) },
                modifier = Modifier.weight(1f),
                leadingIcon = AppIcons.Chat,
            )
        }
    }
}

@Composable
internal fun Description(salon: SalonDetails) {
    val text = salon.description ?: return
    AppExpandableText(text = text)
}

/** Expandable weekly schedule + upcoming exceptional closures (PRD S07 item 7). */
@Composable
internal fun WorkingHoursSection(salon: SalonDetails, expanded: Boolean, onAction: (UiAction) -> Unit) {
    val spacing = AppTheme.spacing
    Column(verticalArrangement = Arrangement.spacedBy(spacing.space8)) {
        Row(
            modifier = Modifier.fillMaxWidth().clickable(role = Role.Button) { onAction(UiAction.OnHoursToggle) },
            verticalAlignment = Alignment.CenterVertically,
        ) {
            AppSectionHeader(title = stringResource(Res.string.salon_hours_title), modifier = Modifier.weight(1f))
            Icon(if (expanded) AppIcons.ExpandLess else AppIcons.ExpandMore, contentDescription = null, tint = AppTheme.colors.muted)
        }
        if (!expanded) return@Column
        salon.weeklySchedule.forEach { day ->
            Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween) {
                AppText(text = day.day?.let { stringResource(it.nameRes()) }.orEmpty())
                val hours = if (day.isOff) stringResource(Res.string.salon_day_off) else day.hours?.text().orEmpty()
                AppText(text = hours, color = AppTheme.colors.muted)
            }
        }
        salon.upcomingClosures.forEach { closure ->
            AppText(
                text = stringResource(Res.string.salon_closure, closure.from, closure.to, closure.reason),
                color = AppTheme.colors.danger,
            )
        }
    }
}
