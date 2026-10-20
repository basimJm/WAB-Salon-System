package com.fab.wab.customer.feature.content.presentation.screen

import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp

/**
 * Values of `design/WAB 06 Account.dc.html` (S23 Legal & support: rich page, FAQ accordion, loading, error) that have
 * no design-system token. Design px = dp. Everything else reads `AppTheme` tokens.
 */
internal object ContentDesign {
    // Page: `padding:8px 20px 30px`
    val pageTop = 8.dp
    val pageHorizontal = 20.dp
    val pageBottom = 30.dp

    // Loading: eight lines `height:14px;border-radius:7px;gap:10px`
    const val shimmerLines = 8
    val shimmerGap = 10.dp

    // Error: `padding:120px 20px`, circle 100, icon 42, title 16/700 `margin-bottom:18px`, Retry 46 `padding:0 28px` 14/600
    val errorVertical = 120.dp
    val errorCircle = 100.dp
    val errorIcon = 42.dp
    val errorCircleBottom = 18.dp
    val errorTitleSize = 16.sp
    val errorTitleBottom = 18.dp
    val retryHeight = 46.dp
    val retryHorizontal = 28.dp
    val retryTextSize = 14.sp

    // Rich blocks: block `margin-bottom:18px`; heading 15/700 `margin-bottom:6px`; paragraph 13.5 muted lh 1.8
    val blockGap = 18.dp
    val headingSize = 15.sp
    val headingBottom = 6.dp
    val paragraphSize = 13.5.sp
    val paragraphLineHeight = 24.sp
    val bulletGap = 8.dp

    // FAQ: `gap:10px`; item radius 16; question `padding:14px 16px;gap:10px` 14/600 on surface; chevron 14;
    // answer `padding:12px 16px 14px` 13 muted lh 1.7
    val faqGap = 10.dp
    val questionVertical = 14.dp
    val questionHorizontal = 16.dp
    val questionGap = 10.dp
    val questionSize = 14.sp
    val faqChevron = 14.dp
    const val chevronOpenRotation = 180f
    val answerTop = 12.dp
    val answerBottom = 14.dp
    val answerSize = 13.sp
    val answerLineHeight = 22.sp

    // Contact rows (same look as the S21 contact sheet): `min-height:54px;padding:0 4px;gap:12px` 14.5; icon box 36/10 icon 18
    val contactRowMinHeight = 54.dp
    val contactRowHorizontal = 4.dp
    val contactTextSize = 14.5.sp
    val contactIconBox = 36.dp
    val contactIconBoxRadius = 10.dp
    val contactIcon = 18.dp
}
