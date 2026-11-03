package com.fab.wab.customer.app.ui.system

import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp

/**
 * Values of `design/WAB 01 Auth.dc.html` (S24 system screens: `on.sys` force update / maintenance, and the splash)
 * that have no design-system token. Design px = dp.
 */
internal object SystemDesign {
    // `padding:60px 32px 40px`, logo 72 (margin-bottom 40), circle 110 (margin-bottom 26), icon 46
    val screenTop = 60.dp
    val screenHorizontal = 32.dp
    val screenBottom = 40.dp
    val logo = 72.dp
    val logoBottom = 40.dp
    val circle = 110.dp
    val circleBottom = 26.dp
    val icon = 46.dp

    // title 23 (margin-bottom 10), body 14 / line-height 1.7 (margin-bottom 34)
    val titleSize = 23.sp
    val titleLineHeight = 30.sp
    val titleBottom = 10.dp
    val bodySize = 14.sp
    val bodyLineHeight = 24.sp
    val bodyBottom = 34.dp

    // Splash (no design frame): brand header 86 like S11, loader below, version at the bottom
    val splashLogo = 120.dp
    val splashGap = 32.dp
}
