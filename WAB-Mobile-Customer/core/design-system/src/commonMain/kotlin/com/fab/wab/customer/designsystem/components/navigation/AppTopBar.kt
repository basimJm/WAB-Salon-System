package com.fab.wab.customer.designsystem.components.navigation

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.RowScope
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.CenterAlignedTopAppBar
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.material3.TopAppBarDefaults
import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.unit.dp
import com.fab.wab.customer.designsystem.icons.AppIcons
import com.fab.wab.customer.designsystem.theme.LocalAppColors

private val TopBarHeight = 64.dp

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun AppTopBar(
    title: String,
    modifier: Modifier = Modifier,
    navigationIcon: ImageVector? = null,
    onNavigationClick: (() -> Unit)? = null,
    actions: @Composable RowScope.() -> Unit = {},
    glassmorphism: Boolean = true,
) {
    val colors = LocalAppColors.current

    val containerColor = if (glassmorphism) {
        Color.White.copy(alpha = 0.05f)
    } else {
        colors.surface
    }

    CenterAlignedTopAppBar(
        title = {
            Text(
                text = title,
                style = MaterialTheme.typography.titleLarge,
                color = colors.onSurface,
            )
        },
        modifier = modifier
            .fillMaxWidth()
            .then(
                if (glassmorphism) {
                    Modifier
                        .background(
                            containerColor,
                            RoundedCornerShape(bottomStart = 24.dp, bottomEnd = 24.dp)
                        )
                        .height(TopBarHeight)
                } else {
                    Modifier.height(TopBarHeight)
                }
            ),
        navigationIcon = {
            if (navigationIcon != null && onNavigationClick != null) {
                IconButton(onClick = onNavigationClick) {
                    Icon(
                        imageVector = navigationIcon,
                        contentDescription = "Back",
                        modifier = Modifier.size(24.dp),
                        tint = colors.primary,
                    )
                }
            }
        },
        actions = actions,
        colors = TopAppBarDefaults.topAppBarColors(
            containerColor = Color.Transparent,
            scrolledContainerColor = Color.Unspecified,
            navigationIconContentColor = Color.Unspecified,
            titleContentColor = colors.onSurface,
            actionIconContentColor = Color.Unspecified
        ),
    )
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun AppTopBarWithBack(
    title: String,
    modifier: Modifier = Modifier,
    onBackClick: () -> Unit,
    actions: @Composable RowScope.() -> Unit = {},
    glassmorphism: Boolean = true,
) {
    AppTopBar(
        title = title,
        modifier = modifier,
        navigationIcon = AppIcons.ArrowBack,
        onNavigationClick = onBackClick,
        actions = actions,
        glassmorphism = glassmorphism,
    )
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun AppTopBarWithMenu(
    title: String,
    modifier: Modifier = Modifier,
    onMenuClick: () -> Unit,
    actions: @Composable RowScope.() -> Unit = {},
    glassmorphism: Boolean = true,
) {
    AppTopBar(
        title = title,
        modifier = modifier,
        navigationIcon = AppIcons.Menu,
        onNavigationClick = onMenuClick,
        actions = actions,
        glassmorphism = glassmorphism,
    )
}
