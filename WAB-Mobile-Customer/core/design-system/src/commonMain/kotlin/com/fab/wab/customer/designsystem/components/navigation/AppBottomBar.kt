package com.fab.wab.customer.designsystem.components.navigation

import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.navigationBarsPadding
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.Icon
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.draw.shadow
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.unit.dp
import androidx.navigation.NavHostController
import com.fab.wab.customer.core.navigation.route.Graph
import com.fab.wab.customer.designsystem.theme.AppWindowWidthClass
import com.fab.wab.customer.designsystem.theme.LocalAppColors
import com.fab.wab.customer.designsystem.theme.LocalTypography
import com.fab.wab.customer.designsystem.theme.LocalWindowWidthClass
import com.fab.wab.customer.designsystem.utils.glassEffect
import org.jetbrains.compose.resources.DrawableResource
import org.jetbrains.compose.resources.painterResource
import org.jetbrains.compose.resources.stringResource

@Composable
fun AppBottomBar(
    navController: NavHostController,
    currentGraph: Graph,
    destinations: List<AppNavDestination>,
) {
    if (LocalWindowWidthClass.current != AppWindowWidthClass.Compact) return
    if (destinations.isEmpty()) return

    val colors = LocalAppColors.current

    Box(
        modifier = Modifier
            .fillMaxWidth()
            .shadow(
                elevation = 8.dp,
                shape = RoundedCornerShape(topStart = 32.dp, topEnd = 32.dp),
                ambientColor = colors.primary.copy(alpha = 0.08f),
                spotColor = colors.primary.copy(alpha = 0.08f),
            )
            .clip(RoundedCornerShape(topStart = 32.dp, topEnd = 32.dp))
            .background(color = colors.surfaceContainerHighest)
            .navigationBarsPadding()
    ) {
        Box(modifier = Modifier.matchParentSize().glassEffect())
        Row(
            modifier = Modifier.fillMaxWidth(),
            horizontalArrangement = Arrangement.SpaceEvenly,
            verticalAlignment = Alignment.CenterVertically
        ) {
            destinations.forEach { destination ->
                NavItem(
                    label = stringResource(destination.labelRes),
                    icon = destination.iconRes,
                    onClick = { navController.navigate(destination.graph) },
                    isSelected = currentGraph == destination.graph,
                )
            }
        }
    }
}

@Composable
private fun NavItem(
    label: String,
    icon: DrawableResource,
    onClick: () -> Unit,
    isSelected: Boolean,
    modifier: Modifier = Modifier,
) {
    val colors = LocalAppColors.current
    val typography = LocalTypography.current

    Box(modifier = Modifier.padding(vertical = 8.dp).clip(RoundedCornerShape(16.dp))) {
        if (isSelected) {
            Box(Modifier.matchParentSize().glassEffect())
        }
        Column(
            modifier = modifier
                .clickable(onClick = onClick)
                .padding(horizontal = 24.dp, vertical = 12.dp),
            horizontalAlignment = Alignment.CenterHorizontally,
            verticalArrangement = Arrangement.spacedBy(8.dp)
        ) {
            Icon(
                painter = painterResource(icon),
                contentDescription = label,
                modifier = Modifier.size(24.dp),
                tint = if (isSelected) colors.primary else Color(0xFF86948A)
            )
            Text(
                text = label,
                style = typography.labelSmall,
                color = if (isSelected) colors.primary else Color(0xFF86948A)
            )
        }
    }
}
