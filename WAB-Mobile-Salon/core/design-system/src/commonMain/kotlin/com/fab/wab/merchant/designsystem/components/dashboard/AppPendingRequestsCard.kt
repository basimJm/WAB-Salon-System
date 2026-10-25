package com.fab.wab.merchant.designsystem.components.dashboard

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.defaultMinSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.runtime.Composable
import androidx.compose.runtime.Immutable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.semantics.Role
import androidx.compose.ui.text.font.FontWeight
import com.fab.wab.merchant.designsystem.components.badge.countBadgeLabel
import com.fab.wab.merchant.designsystem.components.booking.AppBrideBadge
import com.fab.wab.merchant.designsystem.components.booking.autoCancelText
import com.fab.wab.merchant.designsystem.components.booking.pendingAgeText
import com.fab.wab.merchant.designsystem.components.divider.AppDivider
import com.fab.wab.merchant.designsystem.components.glass.glassBackground
import com.fab.wab.merchant.designsystem.components.glass.glassClickable
import com.fab.wab.merchant.designsystem.components.glass.rememberGlassPress
import com.fab.wab.merchant.designsystem.components.text.AppText
import com.fab.wab.merchant.designsystem.resources.Res
import com.fab.wab.merchant.designsystem.resources.booking_persons
import com.fab.wab.merchant.designsystem.resources.action_view_all
import com.fab.wab.merchant.designsystem.resources.meta_pair
import com.fab.wab.merchant.designsystem.resources.pending_requests_title
import com.fab.wab.merchant.designsystem.theme.AppTheme
import com.fab.wab.merchant.designsystem.theme.GlassStyle
import org.jetbrains.compose.resources.pluralStringResource
import org.jetbrains.compose.resources.stringResource
import kotlin.time.Duration

/** One pending request on Home (PRD M07): who, how many, when, how long it has waited, auto-cancel countdown. */
@Immutable
data class PendingRequestUi(
    val id: String,
    val customerName: String,
    val persons: Int,
    val whenText: String,
    val age: Duration,
    val isBride: Boolean = false,
    val autoCancelIn: Duration? = null,
)

/** "Requests awaiting reply" card (design 02 Home `showPending`); [count] is the server total, [requests] the preview. */
@Composable
fun AppPendingRequestsCard(
    count: Int,
    requests: List<PendingRequestUi>,
    onViewAll: () -> Unit,
    onRequestClick: (String) -> Unit,
    modifier: Modifier = Modifier,
) {
    val spacing = AppTheme.spacing
    val colors = AppTheme.colors
    Column(
        modifier = modifier
            .fillMaxWidth()
            .glassBackground(AppTheme.glass, AppTheme.shapes.extraLarge, GlassStyle.Prominent, stateBorder = colors.accentContainer)
            .padding(start = spacing.space14, end = spacing.space14, top = spacing.space14, bottom = spacing.space8),
    ) {
        PendingHeader(count, onViewAll)
        requests.forEach { request ->
            AppDivider()
            PendingRow(request, onClick = { onRequestClick(request.id) })
        }
    }
}

@Composable
private fun PendingHeader(count: Int, onViewAll: () -> Unit) {
    val spacing = AppTheme.spacing
    val colors = AppTheme.colors
    val press = rememberGlassPress()
    Row(
        modifier = Modifier.fillMaxWidth().padding(bottom = spacing.space8),
        horizontalArrangement = Arrangement.spacedBy(spacing.space8),
        verticalAlignment = Alignment.CenterVertically,
    ) {
        Box(
            modifier = Modifier
                .size(AppTheme.sizes.pendingCount)
                .background(Brush.linearGradient(listOf(colors.gradientStart, colors.gradientEnd)), AppTheme.shapes.circle),
            contentAlignment = Alignment.Center,
        ) {
            AppText(
                text = countBadgeLabel(count).orEmpty(),
                style = AppTheme.typography.labelMedium.copy(fontWeight = FontWeight.Bold),
                color = colors.onGradient,
                maxLines = 1,
            )
        }
        AppText(
            text = stringResource(Res.string.pending_requests_title),
            style = AppTheme.typography.titleSmall.copy(fontWeight = FontWeight.Bold),
            modifier = Modifier.weight(1f),
        )
        AppText(
            text = stringResource(Res.string.action_view_all),
            style = AppTheme.typography.labelMedium.copy(fontWeight = FontWeight.Bold),
            color = colors.accent,
            modifier = Modifier
                .defaultMinSize(minHeight = AppTheme.sizes.touchTarget)
                .glassClickable(press, role = Role.Button, onClick = onViewAll)
                .padding(horizontal = spacing.space4, vertical = spacing.space14),
        )
    }
}

@Composable
private fun PendingRow(request: PendingRequestUi, onClick: () -> Unit) {
    val spacing = AppTheme.spacing
    val colors = AppTheme.colors
    val press = rememberGlassPress()
    val persons = pluralStringResource(Res.plurals.booking_persons, request.persons, request.persons)
    Row(
        modifier = Modifier
            .fillMaxWidth()
            .defaultMinSize(minHeight = AppTheme.sizes.touchTarget)
            .glassClickable(press, role = Role.Button, onClick = onClick)
            .padding(horizontal = spacing.space8, vertical = spacing.space10),
        horizontalArrangement = Arrangement.spacedBy(spacing.space10),
    ) {
        Column(modifier = Modifier.weight(1f), verticalArrangement = Arrangement.spacedBy(spacing.space2)) {
            Row(horizontalArrangement = Arrangement.spacedBy(spacing.space6), verticalAlignment = Alignment.CenterVertically) {
                AppText(
                    text = request.customerName,
                    style = AppTheme.typography.titleSmall.copy(fontWeight = FontWeight.Bold),
                    maxLines = 1,
                    modifier = Modifier.weight(1f, fill = false),
                )
                if (request.isBride) AppBrideBadge()
            }
            AppText(
                text = stringResource(Res.string.meta_pair, persons, request.whenText),
                style = AppTheme.typography.bodySmall,
                color = colors.muted,
            )
            val autoCancelIn = request.autoCancelIn
            if (autoCancelIn != null) {
                AppText(
                    text = autoCancelText(autoCancelIn),
                    style = AppTheme.typography.labelSmall,
                    color = colors.onDangerContainer,
                )
            }
        }
        AppText(
            text = pendingAgeText(request.age),
            style = AppTheme.typography.labelSmall,
            color = colors.faint,
            maxLines = 1,
        )
    }
}
