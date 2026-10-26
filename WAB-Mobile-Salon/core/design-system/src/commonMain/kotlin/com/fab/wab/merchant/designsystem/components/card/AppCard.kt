package com.fab.wab.merchant.designsystem.components.card

import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.unit.Dp
import com.fab.wab.merchant.designsystem.components.surface.AppSurface
import com.fab.wab.merchant.designsystem.components.surface.appClickable
import com.fab.wab.merchant.designsystem.theme.AppTheme

/** Card = [AppSurface] (design `background:var(--card);border:1px solid var(--line)`); clickable when [onClick] is set. */
@Composable
fun AppCard(
    modifier: Modifier = Modifier,
    onClick: (() -> Unit)? = null,
    contentPadding: Dp = AppTheme.spacing.space16,
    content: @Composable () -> Unit,
) {
    val shape = AppTheme.shapes.medium
    val clickable = if (onClick != null) Modifier.appClickable(onClick = onClick) else Modifier
    AppSurface(
        modifier = modifier.clip(shape).then(clickable),
        shape = shape,
        contentPadding = PaddingValues(contentPadding),
    ) {
        content()
    }
}
