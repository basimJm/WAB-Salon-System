package com.fab.wab.customer.designsystem.components.navigation

import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxHeight
import androidx.compose.foundation.layout.size
import androidx.compose.material3.Icon
import androidx.compose.material3.NavigationRail
import androidx.compose.material3.NavigationRailItem
import androidx.compose.material3.NavigationRailItemDefaults
import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier
import androidx.navigation.NavHostController
import com.fab.wab.customer.core.navigation.route.Graph
import com.fab.wab.customer.designsystem.components.text.AppTextStyles
import com.fab.wab.customer.designsystem.theme.LocalAppColors
import com.fab.wab.customer.designsystem.theme.LocalSpacing
import org.jetbrains.compose.resources.painterResource
import org.jetbrains.compose.resources.stringResource

@Composable
fun AppNavigationRail(
    navController: NavHostController,
    currentGraph: Graph,
    destinations: List<AppNavDestination>,
    modifier: Modifier = Modifier,
) {
    if (destinations.isEmpty()) return

    val colors = LocalAppColors.current
    val spacing = LocalSpacing.current

    NavigationRail(
        modifier = modifier.fillMaxHeight(),
        containerColor = colors.surfaceContainerHighest,
        contentColor = colors.primary,
    ) {
        Spacer(Modifier.weight(1f))
        destinations.forEach { item ->
            val selected = currentGraph == item.graph
            NavigationRailItem(
                selected = selected,
                onClick = { navController.navigate(item.graph) },
                icon = {
                    Icon(
                        painter = painterResource(item.iconRes),
                        contentDescription = stringResource(item.labelRes),
                        modifier = Modifier.size(spacing.space24),
                    )
                },
                label = {
                    AppTextStyles.labelSmall(
                        text = stringResource(item.labelRes),
                        color = if (selected) colors.primary else colors.onSurfaceVariant,
                    )
                },
                colors = NavigationRailItemDefaults.colors(
                    selectedIconColor = colors.primary,
                    unselectedIconColor = colors.onSurfaceVariant,
                    indicatorColor = colors.primary.copy(alpha = 0.12f),
                    selectedTextColor = colors.primary,
                    unselectedTextColor = colors.onSurfaceVariant,
                ),
            )
        }
        Spacer(Modifier.weight(1f))
    }
}
