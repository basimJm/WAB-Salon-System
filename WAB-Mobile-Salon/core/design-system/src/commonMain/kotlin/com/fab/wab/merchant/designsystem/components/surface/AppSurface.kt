package com.fab.wab.merchant.designsystem.components.surface

import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.BoxScope
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.padding
import androidx.compose.runtime.Composable
import androidx.compose.runtime.staticCompositionLocalOf
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.draw.drawBehind
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.Shape
import androidx.compose.ui.graphics.isSpecified
import androidx.compose.ui.semantics.Role
import androidx.compose.ui.unit.Dp
import com.fab.wab.merchant.designsystem.theme.AppTheme
import com.fab.wab.merchant.designsystem.theme.SurfaceTokens
import com.fab.wab.merchant.designsystem.theme.SurfaceTone

/**
 * The design's flat surface on any element (cards, sections, fields, rows, chips): a solid [tone] fill inside
 * [shape]. A `--card` fill has the `1px solid var(--line)` edge; the tinted `--surface` / `--soft` fills have none
 * (KPI tiles, empty states, unread rows). [stateBorder] (error, focus, selection) draws the 1.5 dp state border
 * instead; `Color.Transparent` removes the edge. Children are not clipped.
 */
fun Modifier.cardBackground(
    t: SurfaceTokens,
    shape: Shape,
    tone: SurfaceTone = SurfaceTone.Card,
    stateBorder: Color = Color.Unspecified,
): Modifier {
    val edge = when {
        stateBorder.isSpecified -> Modifier.border(t.stateBorderWidth, stateBorder, shape)
        tone == SurfaceTone.Card -> Modifier.border(t.lineWidth, t.line, shape)
        else -> Modifier
    }
    return background(t.fill(tone), shape).then(edge)
}

/** Edge of a bar that sits on the content: the design's `border-top` (tab bar, action bar) or `border-bottom` (top bar). */
enum class BarEdge { Top, Bottom }

/** Flat bar background: `background:var(--card)` and a hairline `var(--line)` on one [edge]. */
fun Modifier.barBackground(t: SurfaceTokens, edge: BarEdge): Modifier = background(t.card).drawBehind {
    val width = t.lineWidth.toPx()
    val y = if (edge == BarEdge.Top) width * HALF else size.height - width * HALF
    drawLine(t.line, Offset(0f, y), Offset(size.width, y), strokeWidth = width)
}

/** Tap target with the platform ripple (the design has no press animation). */
fun Modifier.appClickable(enabled: Boolean = true, role: Role = Role.Button, onClick: () -> Unit): Modifier =
    clickable(enabled = enabled, role = role, onClick = onClick)

/**
 * Base container of the design system: [cardBackground] on a box whose children keep their own measurement, input
 * and semantics. [clipContent] clips the children to [shape] (edge-to-edge images).
 */
@Composable
fun AppSurface(
    modifier: Modifier = Modifier,
    shape: Shape = AppTheme.shapes.medium,
    tone: SurfaceTone = SurfaceTone.Card,
    contentPadding: PaddingValues = NoPadding,
    clipContent: Boolean = false,
    content: @Composable BoxScope.() -> Unit,
) {
    Box(
        modifier = modifier.cardBackground(AppTheme.surfaces, shape, tone).then(if (clipContent) Modifier.clip(shape) else Modifier),
        propagateMinConstraints = true,
    ) {
        Box(modifier = Modifier.padding(contentPadding), propagateMinConstraints = true, content = content)
    }
}

private val NoPadding = PaddingValues()

/** Height the tab bar takes over the bottom of a tab screen; screens built with `scrollsUnderTabBar` pad by it. */
val LocalTabBarPadding = staticCompositionLocalOf { Dp.Hairline }

/** A hairline is centred on the edge: half of it inside the bar. */
private const val HALF = 0.5f
