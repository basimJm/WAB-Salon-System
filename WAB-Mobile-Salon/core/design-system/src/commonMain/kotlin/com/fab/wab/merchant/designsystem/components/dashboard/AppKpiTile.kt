package com.fab.wab.merchant.designsystem.components.dashboard

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.padding
import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import com.fab.wab.merchant.designsystem.components.surface.cardBackground
import com.fab.wab.merchant.designsystem.components.text.AppText
import com.fab.wab.merchant.designsystem.theme.AppTheme
import com.fab.wab.merchant.designsystem.theme.SurfaceTone

private const val LABEL_MAX_LINES = 2

/** Emphasis of a KPI value (design: neutral count, green completed). */
enum class KpiTone { Default, Success, Accent }

@Composable
private fun kpiColor(tone: KpiTone): Color = when (tone) {
    KpiTone.Default -> AppTheme.colors.ink
    KpiTone.Success -> AppTheme.colors.success
    KpiTone.Accent -> AppTheme.colors.accent
}

/** Home "today" tile: big value over a short label (design 02 Home `kpi.count` / `kpi.done`). */
@Composable
fun AppKpiTile(
    value: String,
    label: String,
    modifier: Modifier = Modifier,
    tone: KpiTone = KpiTone.Default,
) {
    val shape = AppTheme.shapes.large
    Column(
        modifier = modifier
            .cardBackground(AppTheme.surfaces, shape, SurfaceTone.Surface)
            .padding(AppTheme.spacing.space12),
    ) {
        AppText(text = value, style = AppTheme.typography.headlineMedium, color = kpiColor(tone), maxLines = 1)
        AppText(text = label, style = AppTheme.typography.labelSmall, color = AppTheme.colors.muted, maxLines = LABEL_MAX_LINES)
    }
}

/** Statistics tile: label, value and an optional trend line in green (design 02 Home `stats`, M21). */
@Composable
fun AppStatTile(
    label: String,
    value: String,
    modifier: Modifier = Modifier,
    trend: String? = null,
) {
    val shape = AppTheme.shapes.large
    Column(
        modifier = modifier
            .cardBackground(AppTheme.surfaces, shape)
            .padding(AppTheme.spacing.space12),
    ) {
        AppText(text = label, style = AppTheme.typography.labelSmall, color = AppTheme.colors.muted, maxLines = LABEL_MAX_LINES)
        AppText(text = value, style = AppTheme.typography.titleLarge, maxLines = 1)
        if (!trend.isNullOrBlank()) {
            AppText(text = trend, style = AppTheme.typography.labelSmall, color = AppTheme.colors.success, maxLines = 1)
        }
    }
}

/** "Next" tile on the soft accent fill: caption, time, who (design 02 Home `kpi.next*`). */
@Composable
fun AppNextBookingTile(
    caption: String,
    time: String,
    subtitle: String,
    modifier: Modifier = Modifier,
) {
    val colors = AppTheme.colors
    Column(
        modifier = modifier
            .background(colors.soft, AppTheme.shapes.large)
            .padding(AppTheme.spacing.space12),
    ) {
        AppText(
            text = caption,
            style = AppTheme.typography.labelSmall.copy(fontWeight = FontWeight.Bold),
            color = colors.accent,
            maxLines = 1,
        )
        AppText(text = time, style = AppTheme.typography.titleSmall.copy(fontWeight = FontWeight.Bold), maxLines = 1)
        AppText(text = subtitle, style = AppTheme.typography.labelSmall, color = colors.muted, maxLines = 1)
    }
}
