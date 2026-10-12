package com.fab.wab.customer.designsystem.components.card

import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.padding
import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.semantics.Role
import androidx.compose.ui.unit.Dp
import com.fab.wab.customer.designsystem.theme.AppTheme
import com.fab.wab.customer.designsystem.utils.softShadow

/** Surface with the design's hairline border and soft shadow; clickable when [onClick] is set. */
@Composable
fun AppCard(
    modifier: Modifier = Modifier,
    onClick: (() -> Unit)? = null,
    contentPadding: Dp = AppTheme.spacing.space16,
    content: @Composable () -> Unit,
) {
    val colors = AppTheme.colors
    val shape = AppTheme.shapes.medium
    val clickable = if (onClick != null) Modifier.clickable(role = Role.Button, onClick = onClick) else Modifier
    Box(
        modifier = modifier
            .softShadow(AppTheme.elevation.card, colors.shadow.copy(alpha = AppTheme.elevation.cardShadowAlpha), shape)
            .clip(shape)
            .background(colors.card)
            .border(AppTheme.sizes.hairline, colors.line, shape)
            .then(clickable)
            .padding(contentPadding),
    ) {
        content()
    }
}
