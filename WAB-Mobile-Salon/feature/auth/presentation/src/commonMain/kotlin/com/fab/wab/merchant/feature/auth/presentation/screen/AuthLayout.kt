package com.fab.wab.merchant.feature.auth.presentation.screen

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.BoxWithConstraints
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.ColumnScope
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.WindowInsets
import androidx.compose.foundation.layout.asPaddingValues
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.heightIn
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.statusBars
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.verticalScroll
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.unit.Dp
import androidx.compose.ui.unit.coerceAtLeast
import com.fab.wab.merchant.designsystem.theme.AppTheme

/** Design `--authbg`: a top-to-bottom hero gradient behind every auth screen (`heroStart → heroMiddle → heroEnd`). */
@Composable
internal fun authHeroBrush(): Brush {
    val colors = AppTheme.colors
    return Brush.verticalGradient(listOf(colors.heroStart, colors.heroMiddle, colors.heroEnd))
}

/**
 * `padding:54px 22px 26px` (login/register) or `54px 22px 30px` (OTP). The design's 54 px top is measured from the
 * top of the phone, under its absolute status bar; `AppScreen` already pads the status bar, so only the rest of the
 * 54 dp is added here (at least [AuthDesign.screenTopMin]) — the header sits where the design draws it.
 */
@Composable
internal fun authScreenPadding(horizontal: Dp = AuthDesign.screenHorizontal, bottom: Dp = AuthDesign.screenBottom): PaddingValues {
    val statusBar = WindowInsets.statusBars.asPaddingValues().calculateTopPadding()
    val top = (AuthDesign.screenTop - statusBar).coerceAtLeast(AuthDesign.screenTopMin)
    return PaddingValues(start = horizontal, end = horizontal, top = top, bottom = bottom)
}

/**
 * Scrollable screen column on the hero gradient whose minimum height is the viewport, so `Modifier.weight(1f)`
 * spacers push the footer to the bottom (the design's `flex:1`) while short screens still scroll.
 */
@Composable
internal fun AuthScrollColumn(
    contentPadding: PaddingValues,
    modifier: Modifier = Modifier,
    horizontalAlignment: Alignment.Horizontal = Alignment.Start,
    content: @Composable ColumnScope.() -> Unit,
) {
    BoxWithConstraints(modifier = modifier.fillMaxSize().background(authHeroBrush())) {
        Column(
            modifier = Modifier
                .fillMaxWidth()
                .verticalScroll(rememberScrollState())
                .heightIn(min = maxHeight)
                .padding(contentPadding),
            horizontalAlignment = horizontalAlignment,
            content = content,
        )
    }
}
