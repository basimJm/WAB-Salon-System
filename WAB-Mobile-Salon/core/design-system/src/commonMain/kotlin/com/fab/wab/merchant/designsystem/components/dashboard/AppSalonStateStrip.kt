package com.fab.wab.merchant.designsystem.components.dashboard

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.ExperimentalLayoutApi
import androidx.compose.foundation.layout.FlowRow
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.defaultMinSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.material3.Icon
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.font.FontWeight
import com.fab.wab.merchant.core.domain.session.SalonState
import com.fab.wab.merchant.designsystem.components.badge.StatusTone
import com.fab.wab.merchant.designsystem.components.badge.statusColors
import com.fab.wab.merchant.designsystem.components.glass.glassClickable
import com.fab.wab.merchant.designsystem.components.glass.glassPressScale
import com.fab.wab.merchant.designsystem.components.glass.rememberGlassPress
import com.fab.wab.merchant.designsystem.components.text.AppText
import com.fab.wab.merchant.designsystem.icons.AppIcons
import com.fab.wab.merchant.designsystem.resources.Res
import com.fab.wab.merchant.designsystem.resources.salon_state_incomplete
import com.fab.wab.merchant.designsystem.resources.salon_state_incomplete_hint
import com.fab.wab.merchant.designsystem.resources.salon_state_live
import com.fab.wab.merchant.designsystem.resources.salon_state_live_hint
import com.fab.wab.merchant.designsystem.resources.salon_state_offline
import com.fab.wab.merchant.designsystem.resources.salon_state_offline_hint
import com.fab.wab.merchant.designsystem.resources.salon_state_pending
import com.fab.wab.merchant.designsystem.resources.salon_state_pending_hint
import com.fab.wab.merchant.designsystem.resources.salon_state_rejected
import com.fab.wab.merchant.designsystem.resources.salon_state_rejected_hint
import com.fab.wab.merchant.designsystem.theme.AppTheme
import org.jetbrains.compose.resources.StringResource
import org.jetbrains.compose.resources.stringResource

/** Chip hue per salon state (design: live green, offline rose, incomplete / under review amber, rejected rose). */
fun salonStateTone(state: SalonState): StatusTone = when (state) {
    SalonState.LIVE -> StatusTone.Success
    SalonState.OFFLINE, SalonState.APPLICATION_REJECTED -> StatusTone.Danger
    SalonState.APPROVED_INCOMPLETE, SalonState.APPLICATION_PENDING -> StatusTone.Warning
}

/** Label + hint resources per state (checked by the unit test). */
internal val salonStateTexts: Map<SalonState, Pair<StringResource, StringResource>> = mapOf(
    SalonState.LIVE to (Res.string.salon_state_live to Res.string.salon_state_live_hint),
    SalonState.OFFLINE to (Res.string.salon_state_offline to Res.string.salon_state_offline_hint),
    SalonState.APPROVED_INCOMPLETE to (Res.string.salon_state_incomplete to Res.string.salon_state_incomplete_hint),
    SalonState.APPLICATION_PENDING to (Res.string.salon_state_pending to Res.string.salon_state_pending_hint),
    SalonState.APPLICATION_REJECTED to (Res.string.salon_state_rejected to Res.string.salon_state_rejected_hint),
)

/** Home state strip (PRD M07): the salon state chip with its dot, then what the state means for bookings. */
@OptIn(ExperimentalLayoutApi::class)
@Composable
fun AppSalonStateStrip(state: SalonState, modifier: Modifier = Modifier) {
    val (label, hint) = salonStateTexts.getValue(state)
    val spacing = AppTheme.spacing
    FlowRow(
        modifier = modifier.fillMaxWidth(),
        horizontalArrangement = Arrangement.spacedBy(spacing.space8),
        verticalArrangement = Arrangement.spacedBy(spacing.space4),
        itemVerticalAlignment = Alignment.CenterVertically,
    ) {
        AppSalonStateChip(state = state, label = stringResource(label))
        AppText(text = stringResource(hint), style = AppTheme.typography.bodySmall, color = AppTheme.colors.muted)
    }
}

@Composable
fun AppSalonStateChip(state: SalonState, label: String, modifier: Modifier = Modifier) {
    val (content, container) = statusColors(salonStateTone(state), AppTheme.colors)
    val spacing = AppTheme.spacing
    Row(
        modifier = modifier
            .defaultMinSize(minHeight = AppTheme.sizes.badgeHeight)
            .background(container, AppTheme.shapes.pill)
            .padding(horizontal = spacing.space10, vertical = spacing.space4),
        horizontalArrangement = Arrangement.spacedBy(spacing.space6),
        verticalAlignment = Alignment.CenterVertically,
    ) {
        Box(Modifier.size(AppTheme.sizes.statusDot).background(content, AppTheme.shapes.circle))
        AppText(text = label, style = AppTheme.typography.labelMedium.copy(fontWeight = FontWeight.Bold), color = content, maxLines = 1)
    }
}

/** Amber notice card under the strip (e.g. "Free trial ends in 5 days"), tappable when [onClick] is set. */
@Composable
fun AppWarningBanner(
    title: String,
    body: String,
    modifier: Modifier = Modifier,
    onClick: (() -> Unit)? = null,
) {
    val colors = AppTheme.colors
    val spacing = AppTheme.spacing
    val press = rememberGlassPress()
    val clickable = if (onClick != null) Modifier.glassPressScale(press).glassClickable(press, onClick = onClick) else Modifier
    Row(
        modifier = modifier
            .fillMaxWidth()
            .then(clickable)
            .background(colors.warningContainer, AppTheme.shapes.large)
            .padding(horizontal = spacing.space14, vertical = spacing.space12),
        horizontalArrangement = Arrangement.spacedBy(spacing.space10),
        verticalAlignment = Alignment.CenterVertically,
    ) {
        Box(
            modifier = Modifier.size(AppTheme.sizes.avatarSmall).background(colors.warningContainer, AppTheme.shapes.small),
            contentAlignment = Alignment.Center,
        ) {
            Icon(AppIcons.Clock, contentDescription = null, tint = colors.onWarningContainer, modifier = Modifier.size(AppTheme.sizes.icon))
        }
        Column(modifier = Modifier.weight(1f)) {
            AppText(
                text = title,
                style = AppTheme.typography.labelMedium.copy(fontWeight = FontWeight.Bold),
                color = colors.onWarningContainer,
            )
            AppText(text = body, style = AppTheme.typography.bodySmall, color = colors.muted)
        }
        if (onClick != null) {
            Icon(AppIcons.Forward, contentDescription = null, tint = colors.faint, modifier = Modifier.size(AppTheme.sizes.iconSmall))
        }
    }
}
