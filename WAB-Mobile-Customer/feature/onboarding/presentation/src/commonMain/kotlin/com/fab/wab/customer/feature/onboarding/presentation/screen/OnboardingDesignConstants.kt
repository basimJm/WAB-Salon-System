package com.fab.wab.customer.feature.onboarding.presentation.screen

import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp

/**
 * Values of `design/WAB 01 Auth.dc.html` (S01 onboarding, S02 nickname & gender) that have no design-system token.
 * Design px = dp. Everything else on these screens reads `AppTheme` tokens.
 */
internal object OnboardingDesign {
    // S01: `padding:54px 24px 34px`, Skip row min 44, image 360 / radius 28 / shadow `0 20px 50px rgba(109,40,217,.18)`
    val screenTop = 54.dp
    val screenHorizontal = 24.dp
    val screenBottom = 34.dp
    val topRowMinHeight = 44.dp
    val skipSize = 14.sp
    val skipVerticalPadding = 10.dp
    val skipHorizontalPadding = 4.dp
    val imageHeight = 360.dp
    val imageHeightCompact = 200.dp
    val imageRadius = 28.dp
    val imageShadowAlpha = 0.18f
    val imageIcon = 96.dp
    val contentGap = 30.dp
    val titleSize = 25.sp
    val titleLineHeight = 32.sp
    val titleBottom = 10.dp
    val textSize = 14.sp
    val textLineHeight = 24.sp
    val textHorizontalPadding = 12.dp
    val bottomRowTop = 24.dp
    val bottomRowGap = 16.dp

    // Dots: 8 × 8, active 22 wide, radius 4, gap 6, active = gradient end, inactive = line
    val dotSize = 8.dp
    val dotActiveWidth = 22.dp
    val dotRadius = 4.dp
    val dotGap = 6.dp

    // CTA: `height:52px;padding:0 28px;border-radius:14px`, 14.5/600
    val ctaHeight = 52.dp
    val ctaHorizontalPadding = 28.dp
    val ctaSize = 14.5.sp

    // S02: `padding:74px 24px 34px`, logo 64 (margin-bottom 24), title 24 (mb 6), subtitle 13.5 (mb 28), labels 12.5
    val nickTop = 74.dp
    val logo = 64.dp
    val logoBottom = 24.dp
    val nickTitleSize = 24.sp
    val nickTitleLineHeight = 32.sp
    val nickTitleBottom = 6.dp
    val nickSubtitleSize = 13.5.sp
    val nickSubtitleLineHeight = 22.sp
    val nickSubtitleBottom = 28.dp
    val labelSize = 12.5.sp
    val labelBottom = 8.dp
    val fieldTextSize = 15.sp
    val errorSize = 12.sp
    val errorTop = 6.dp
    val genderLabelTop = 22.dp
    val genderGap = 12.dp
    val genderCardRadius = 18.dp
    val genderIcon = 26.dp
    val genderLabelTextSize = 14.5.sp
}
