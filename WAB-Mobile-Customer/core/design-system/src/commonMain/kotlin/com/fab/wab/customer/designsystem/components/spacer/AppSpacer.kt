package com.fab.wab.customer.designsystem.components.spacer

import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.width
import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier
import androidx.compose.ui.unit.Dp
import com.fab.wab.customer.designsystem.theme.LocalSpacing

@Composable
fun AppSpacer(
    size: Dp,
    modifier: Modifier = Modifier,
    isVertical: Boolean = true,
) {
    if (isVertical) {
        Spacer(modifier = modifier.height(size))
    } else {
        Spacer(modifier = modifier.width(size))
    }
}

object AppSpacerHorizontal {
    @Composable
    operator fun invoke(modifier: Modifier = Modifier, size: Dp = LocalSpacing.current.space8) {
        AppSpacer(size = size, modifier = modifier, isVertical = false)
    }

    @Composable
    fun Xs(modifier: Modifier = Modifier) = invoke(modifier, LocalSpacing.current.space4)
    @Composable
    fun Sm(modifier: Modifier = Modifier) = invoke(modifier, LocalSpacing.current.space8)
    @Composable
    fun Md(modifier: Modifier = Modifier) = invoke(modifier, LocalSpacing.current.space12)
    @Composable
    fun Lg(modifier: Modifier = Modifier) = invoke(modifier, LocalSpacing.current.space16)
    @Composable
    fun Xl(modifier: Modifier = Modifier) = invoke(modifier, LocalSpacing.current.space24)
    @Composable
    fun Xxl(modifier: Modifier = Modifier) = invoke(modifier, LocalSpacing.current.space32)
}

object AppSpacerVertical {
    @Composable
    operator fun invoke(modifier: Modifier = Modifier, size: Dp = LocalSpacing.current.space8) {
        AppSpacer(size = size, modifier = modifier, isVertical = true)
    }

    @Composable
    fun Xs(modifier: Modifier = Modifier) = invoke(modifier, LocalSpacing.current.space4)
    @Composable
    fun Sm(modifier: Modifier = Modifier) = invoke(modifier, LocalSpacing.current.space8)
    @Composable
    fun Md(modifier: Modifier = Modifier) = invoke(modifier, LocalSpacing.current.space12)
    @Composable
    fun Lg(modifier: Modifier = Modifier) = invoke(modifier, LocalSpacing.current.space16)
    @Composable
    fun Xl(modifier: Modifier = Modifier) = invoke(modifier, LocalSpacing.current.space24)
    @Composable
    fun Xxl(modifier: Modifier = Modifier) = invoke(modifier, LocalSpacing.current.space32)
}
