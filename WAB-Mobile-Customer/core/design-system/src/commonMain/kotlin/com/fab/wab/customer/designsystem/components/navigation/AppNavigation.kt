package com.fab.wab.customer.designsystem.components.navigation

import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.WindowInsets
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
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.semantics.Role
import androidx.compose.ui.semantics.selected
import androidx.compose.ui.semantics.semantics
import com.fab.wab.customer.designsystem.components.badge.AppCountBadge
import com.fab.wab.customer.designsystem.components.text.AppText
import com.fab.wab.customer.designsystem.theme.AppTheme
import com.fab.wab.customer.designsystem.theme.NavigationStyle

/** A top-level destination. [id] is any stable key owned by the app (route name); the design system never imports routes. */
@Immutable
data class AppNavItem(
    val id: String,
    val label: String,
    val icon: ImageVector,
    val badgeCount: Int = 0,
)

@Composable
private fun NavItemContent(item: AppNavItem, selected: Boolean, modifier: Modifier = Modifier) {
    val colors = AppTheme.colors
    val tint = if (selected) colors.accent else colors.faint
    Column(modifier = modifier, horizontalAlignment = Alignment.CenterHorizontally, verticalArrangement = Arrangement.Center) {
        Box {
            Icon(item.icon, contentDescription = null, tint = tint, modifier = Modifier.size(AppTheme.sizes.iconLarge))
            AppCountBadge(item.badgeCount, Modifier.align(Alignment.TopEnd))
        }
        AppText(text = item.label, style = AppTheme.typography.labelSmall, color = tint, maxLines = 1)
    }
}

/** Bottom bar for compact portrait windows (Home, Favorites, Bookings, Profile). */
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
            .background(AppTheme.colors.card)
            .windowInsetsPadding(WindowInsets.navigationBars),
    ) {
        items.forEach { item ->
            val selected = item.id == selectedId
            NavItemContent(
                item = item,
                selected = selected,
                modifier = Modifier
                    .weight(1f)
                    .size(width = AppTheme.sizes.touchTarget, height = AppTheme.sizes.bottomBarHeight)
                    .semantics { this.selected = selected }
                    .clickable(role = Role.Tab) { onSelect(item.id) },
            )
        }
    }
}

/** Navigation rail for landscape and larger windows. */
@Composable
fun AppNavigationRail(
    items: List<AppNavItem>,
    selectedId: String,
    onSelect: (String) -> Unit,
    modifier: Modifier = Modifier,
) {
    Column(
        modifier = modifier
            .fillMaxHeight()
            .width(AppTheme.sizes.railWidth)
            .background(AppTheme.colors.card)
            .windowInsetsPadding(WindowInsets.systemBars)
            .padding(vertical = AppTheme.spacing.space12),
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
                    .size(width = AppTheme.sizes.railWidth, height = AppTheme.sizes.bottomBarHeight)
                    .semantics { this.selected = selected }
                    .clickable(role = Role.Tab) { onSelect(item.id) },
            )
        }
    }
}

/** Chooses bottom bar or rail from the window, so every screen adapts the same way in portrait and landscape. */
@Composable
fun AppNavScaffold(
    items: List<AppNavItem>,
    selectedId: String,
    onSelect: (String) -> Unit,
    modifier: Modifier = Modifier,
    content: @Composable () -> Unit,
) {
    // One content instance moves between the two layouts, so its state survives a rotation.
    val body = remember(content) { movableContentOf { content() } }
    when (AppTheme.adaptive.navigation) {
        NavigationStyle.BottomBar -> Column(modifier.fillMaxSize()) {
            Box(Modifier.weight(1f)) { body() }
            AppBottomBar(items, selectedId, onSelect)
        }
        NavigationStyle.Rail -> Row(modifier.fillMaxSize()) {
            AppNavigationRail(items, selectedId, onSelect)
            Box(Modifier.weight(1f)) { body() }
        }
    }
}
