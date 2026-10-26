package com.fab.wab.merchant.designsystem.components.navigation

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.WindowInsets
import androidx.compose.foundation.layout.consumeWindowInsets
import androidx.compose.foundation.layout.defaultMinSize
import androidx.compose.foundation.layout.fillMaxHeight
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.navigationBars
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.systemBars
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.layout.windowInsetsPadding
import androidx.compose.material3.Icon
import androidx.compose.runtime.Composable
import androidx.compose.runtime.Immutable
import androidx.compose.runtime.movableContentOf
import androidx.compose.runtime.remember
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.drawBehind
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.platform.LocalLayoutDirection
import androidx.compose.ui.semantics.Role
import androidx.compose.ui.semantics.selected
import androidx.compose.ui.semantics.semantics
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.LayoutDirection
import com.fab.wab.merchant.designsystem.components.badge.AppCountBadge
import com.fab.wab.merchant.designsystem.components.surface.BarEdge
import com.fab.wab.merchant.designsystem.components.surface.appClickable
import com.fab.wab.merchant.designsystem.components.surface.barBackground
import com.fab.wab.merchant.designsystem.components.text.AppText
import com.fab.wab.merchant.designsystem.theme.AppTheme
import com.fab.wab.merchant.designsystem.theme.NavigationStyle

/** A top-level destination. [id] is any stable key owned by the app (route name); the design system never imports routes. */
@Immutable
data class AppNavItem(
    val id: String,
    val label: String,
    val icon: ImageVector,
    val badgeCount: Int = 0,
)

/** Design tab item: `flex:1;flex-direction:column;gap:3px;padding:6px 0`, 22 dp icon, 11 sp label 700 / 500, accent / faint. */
@Composable
private fun NavItemContent(item: AppNavItem, selected: Boolean, modifier: Modifier = Modifier) {
    val colors = AppTheme.colors
    val tint = if (selected) colors.accent else colors.faint
    val weight = if (selected) FontWeight.Bold else FontWeight.Medium
    Column(
        modifier = modifier.padding(vertical = AppTheme.spacing.space6),
        horizontalAlignment = Alignment.CenterHorizontally,
        verticalArrangement = Arrangement.spacedBy(AppTheme.spacing.space3, Alignment.CenterVertically),
    ) {
        Box {
            Icon(item.icon, contentDescription = null, tint = tint, modifier = Modifier.size(AppTheme.sizes.tabIcon))
            AppCountBadge(item.badgeCount, Modifier.align(Alignment.TopEnd))
        }
        AppText(text = item.label, style = AppTheme.typography.labelSmall.copy(fontWeight = weight), color = tint, maxLines = 1)
    }
}

/**
 * The design's tab bar (`WAB Merchant 02 Home.dc.html`): attached to the bottom, `background:var(--card)`,
 * `border-top:1px solid var(--line)`, `padding:8px 6px` above the system navigation bar; no pill on the selected tab.
 */
@Composable
fun AppBottomBar(
    items: List<AppNavItem>,
    selectedId: String,
    onSelect: (String) -> Unit,
    modifier: Modifier = Modifier,
) {
    Row(
        modifier = modifier
            .fillMaxWidth()
            .barBackground(AppTheme.surfaces, BarEdge.Top)
            .windowInsetsPadding(WindowInsets.navigationBars)
            .padding(top = AppTheme.spacing.space8, start = AppTheme.spacing.space6, end = AppTheme.spacing.space6),
    ) {
        items.forEach { item ->
            val selected = item.id == selectedId
            NavItemContent(
                item = item,
                selected = selected,
                modifier = Modifier
                    .weight(1f)
                    .defaultMinSize(minHeight = AppTheme.sizes.touchTarget)
                    .semantics { this.selected = selected }
                    .appClickable(role = Role.Tab) { onSelect(item.id) },
            )
        }
    }
}

/** Landscape and larger windows: the same flat items in a side rail (`var(--card)` with a `var(--line)` edge). */
@Composable
fun AppNavigationRail(
    items: List<AppNavItem>,
    selectedId: String,
    onSelect: (String) -> Unit,
    modifier: Modifier = Modifier,
) {
    val surfaces = AppTheme.surfaces
    val rtl = LocalLayoutDirection.current == LayoutDirection.Rtl
    Column(
        modifier = modifier
            .fillMaxHeight()
            .background(surfaces.card)
            .drawBehind {
                // Edge on the content side: end in LTR, start (drawn on the left) in RTL.
                val width = surfaces.lineWidth.toPx()
                val x = if (rtl) width * HALF else size.width - width * HALF
                drawLine(surfaces.line, Offset(x, 0f), Offset(x, size.height), strokeWidth = width)
            }
            .windowInsetsPadding(WindowInsets.systemBars)
            .width(AppTheme.sizes.railWidth)
            .padding(vertical = AppTheme.spacing.space12, horizontal = AppTheme.spacing.space6),
        verticalArrangement = Arrangement.spacedBy(AppTheme.spacing.space12, Alignment.CenterVertically),
        horizontalAlignment = Alignment.CenterHorizontally,
    ) {
        items.forEach { item ->
            val selected = item.id == selectedId
            NavItemContent(
                item = item,
                selected = selected,
                modifier = Modifier
                    .fillMaxWidth()
                    .defaultMinSize(minHeight = AppTheme.sizes.touchTarget)
                    .semantics { this.selected = selected }
                    .appClickable(role = Role.Tab) { onSelect(item.id) },
            )
        }
    }
}

/**
 * Chooses bottom bar or rail from the window, so every screen adapts the same way in portrait and landscape. The bar
 * is attached below the content (never over it), so tab screens need no bottom inset.
 */
@Composable
fun AppNavScaffold(
    items: List<AppNavItem>,
    selectedId: String,
    onSelect: (String) -> Unit,
    modifier: Modifier = Modifier,
    navigationVisible: Boolean = true,
    content: @Composable () -> Unit,
) {
    // One content instance moves between the two layouts, so its state survives a rotation.
    val body = remember(content) { movableContentOf { content() } }
    if (!navigationVisible) {
        Box(modifier.fillMaxSize()) { body() }
        return
    }
    when (AppTheme.adaptive.navigation) {
        NavigationStyle.BottomBar -> Column(modifier.fillMaxSize().background(AppTheme.colors.background)) {
            Box(Modifier.weight(1f).fillMaxWidth().consumeWindowInsets(WindowInsets.navigationBars)) { body() }
            AppBottomBar(items, selectedId, onSelect)
        }
        // The rail column shares the screens' themed background (no light window strip in the dark theme).
        NavigationStyle.Rail -> Row(modifier.fillMaxSize().background(AppTheme.colors.background)) {
            AppNavigationRail(items, selectedId, onSelect)
            Box(Modifier.weight(1f)) { body() }
        }
    }
}

/** A hairline is centred on the edge: half of it inside the bar. */
private const val HALF = 0.5f
