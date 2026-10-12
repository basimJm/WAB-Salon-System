package com.fab.wab.customer.designsystem.components.divider

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.fillMaxHeight
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.width
import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.unit.Dp
import androidx.compose.ui.unit.dp
import com.fab.wab.customer.designsystem.theme.LocalAppColors

object AppDividerHorizontal {
    @Composable
    operator fun invoke(
        modifier: Modifier = Modifier,
        thickness: Dp = 1.dp,
        color: Color = LocalAppColors.current.outlineVariant,
    ) {
        Box(
            modifier = modifier
                .fillMaxWidth()
                .height(thickness)
                .background(color)
        )
    }
}

object AppDividerVertical {
    @Composable
    operator fun invoke(
        modifier: Modifier = Modifier,
        thickness: Dp = 1.dp,
        color: Color = LocalAppColors.current.outlineVariant,
    ) {
        Box(
            modifier = modifier
                .fillMaxHeight()
                .width(thickness)
                .background(color)
        )
    }
}

@Composable
fun AppDivider(
    isVertical: Boolean = false,
    modifier: Modifier = Modifier,
    thickness: Dp = 1.dp,
    color: Color = LocalAppColors.current.outlineVariant,
) {
    if (isVertical) {
        AppDividerVertical(modifier = modifier, thickness = thickness, color = color)
    } else {
        AppDividerHorizontal(modifier = modifier, thickness = thickness, color = color)
    }
}
