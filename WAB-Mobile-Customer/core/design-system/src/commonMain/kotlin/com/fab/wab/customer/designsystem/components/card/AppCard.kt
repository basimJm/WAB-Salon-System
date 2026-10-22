package com.fab.wab.customer.designsystem.components.card

import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier
import androidx.compose.ui.unit.Dp
import com.fab.wab.customer.designsystem.components.glass.AppGlassSurface
import com.fab.wab.customer.designsystem.components.glass.glassClickable
import com.fab.wab.customer.designsystem.components.glass.glassPressScale
import com.fab.wab.customer.designsystem.components.glass.rememberGlassPress
import com.fab.wab.customer.designsystem.theme.AppTheme
import com.fab.wab.customer.designsystem.utils.softShadow

/** Card = [AppGlassSurface] (regular glass) with the design soft shadow; clickable (liquid press) when [onClick] is set. */
@Composable
fun AppCard(
    modifier: Modifier = Modifier,
    onClick: (() -> Unit)? = null,
    contentPadding: Dp = AppTheme.spacing.space16,
    content: @Composable () -> Unit,
) {
    val colors = AppTheme.colors
    val shape = AppTheme.shapes.medium
    val press = rememberGlassPress()
    val clickable = if (onClick != null) Modifier.glassClickable(press, onClick = onClick) else Modifier
    AppGlassSurface(
        modifier = modifier
            .glassPressScale(press)
            .softShadow(AppTheme.elevation.card, colors.shadow.copy(alpha = AppTheme.elevation.cardShadowAlpha), shape)
            .then(clickable),
        shape = shape,
        contentPadding = PaddingValues(contentPadding),
    ) {
        content()
    }
}
