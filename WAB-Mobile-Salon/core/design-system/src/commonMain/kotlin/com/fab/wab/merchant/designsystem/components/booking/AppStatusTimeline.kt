package com.fab.wab.merchant.designsystem.components.booking

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.IntrinsicSize
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.runtime.Composable
import androidx.compose.runtime.Immutable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.drawBehind
import androidx.compose.ui.text.font.FontWeight
import com.fab.wab.merchant.designsystem.components.text.AppText
import com.fab.wab.merchant.designsystem.resources.Res
import com.fab.wab.merchant.designsystem.resources.meta_pair
import com.fab.wab.merchant.designsystem.theme.AppTheme
import org.jetbrains.compose.resources.stringResource

/** One status change of a booking (PRD M09 status history): pre-localized title, actor, time and optional reason. */
@Immutable
data class StatusHistoryEntryUi(
    val title: String,
    val actor: String,
    val time: String,
    val note: String? = null,
)

/** Vertical status history, oldest first; the latest entry's dot is highlighted (design 03 Bookings, details). */
@Composable
fun AppStatusTimeline(entries: List<StatusHistoryEntryUi>, modifier: Modifier = Modifier) {
    Column(modifier = modifier.fillMaxWidth()) {
        entries.forEachIndexed { index, entry ->
            TimelineRow(entry = entry, isLatest = index == entries.lastIndex)
        }
    }
}

@Composable
private fun TimelineRow(entry: StatusHistoryEntryUi, isLatest: Boolean) {
    val spacing = AppTheme.spacing
    val colors = AppTheme.colors
    Row(
        modifier = Modifier.fillMaxWidth().height(IntrinsicSize.Min),
        horizontalArrangement = Arrangement.spacedBy(spacing.space12),
    ) {
        Column(
            modifier = Modifier.width(AppTheme.sizes.timelineDot),
            horizontalAlignment = Alignment.CenterHorizontally,
        ) {
            TimelineDot(isLatest)
            if (!isLatest) {
                Box(
                    modifier = Modifier
                        .padding(vertical = spacing.space2)
                        .width(AppTheme.sizes.stepLine)
                        .weight(1f)
                        .background(colors.line),
                )
            }
        }
        Column(modifier = Modifier.weight(1f).padding(bottom = if (isLatest) spacing.space0 else spacing.space14)) {
            AppText(text = entry.title, style = AppTheme.typography.labelMedium.copy(fontWeight = FontWeight.Bold))
            AppText(
                text = stringResource(Res.string.meta_pair, entry.actor, entry.time),
                style = AppTheme.typography.bodySmall,
                color = colors.muted,
            )
            val note = entry.note
            if (!note.isNullOrBlank()) {
                AppText(text = note, style = AppTheme.typography.bodySmall, modifier = Modifier.padding(top = spacing.space2))
            }
        }
    }
}

@Composable
private fun TimelineDot(isLatest: Boolean) {
    val colors = AppTheme.colors
    val halo = AppTheme.sizes.timelineHalo
    val fill = if (isLatest) colors.gradientEnd else colors.line
    Box(
        modifier = Modifier
            .padding(top = AppTheme.spacing.space2)
            .size(AppTheme.sizes.timelineDot)
            .drawBehind {
                if (isLatest) drawCircle(colors.accentContainer, radius = size.minDimension / HALF + halo.toPx())
                drawCircle(fill)
            },
    )
}

private const val HALF = 2f
