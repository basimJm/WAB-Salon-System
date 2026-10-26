package com.fab.wab.merchant.feature.auth.presentation.screen

import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp

/**
 * Values of `design/WAB 01 Auth.dc.html` (S11, S12, S13 and their sheets/dialogs) that have no design-system token.
 * Design px = dp. Everything else on these screens reads `AppTheme` tokens.
 */
internal object AuthDesign {
    // Screen padding: `padding:54px 22px 26px` (login/register), `54px 24px 30px` (OTP)
    val screenTop = 54.dp
    val screenHorizontal = 22.dp
    val screenBottom = 26.dp
    val otpHorizontal = 24.dp
    val otpBottom = 30.dp

    // Top pills: `height:40px;min-width:44px;border-radius:12px;border:1px solid var(--line)`
    val pillMinWidth = 44.dp
    val pillRadius = 12.dp
    val pillHorizontalPadding = 12.dp
    val pillIcon = 18.dp
    val pillVerticalInset = 4.dp // (48 dp touch target - 40 dp pill) / 2
    val pillBackIcon = 20.dp
    val pillLabelSize = 13.sp
    val topRowMinHeight = 44.dp

    // Brand header: logo 86 (login) / 54 (register); `margin:14px 0 26px`
    val loginLogo = 86.dp
    val registerLogo = 54.dp
    val brandTop = 14.dp
    val brandBottom = 26.dp
    val registerHeaderTop = 18.dp
    val registerHeaderBottom = 20.dp

    // Card: `border-radius:24px;padding:22px 18px` (login) / `20px 16px` (register); shadow `0 16px 40px rgba(31,34,51,.08)`
    val cardRadius = 24.dp
    const val cardShadowAlpha = 0.08f
    val loginCardVertical = 22.dp
    val loginCardHorizontal = 18.dp
    val registerCardVertical = 20.dp
    val registerCardHorizontal = 16.dp
    val registerCardGap = 14.dp
    val nameGap = 10.dp

    // Texts
    val cardTitleSize = 21.sp
    val cardTitleLineHeight = 28.sp
    val subtitleSize = 13.sp
    val subtitleLineHeight = 21.sp
    val registerSubtitleSize = 12.5.sp
    val labelSize = 12.5.sp
    val registerLabelSize = 12.sp
    val fieldTextSize = 15.sp
    val fieldLetterSpacing = 0.5.sp
    val errorSize = 12.sp
    val registerErrorSize = 11.5.sp
    val errorTop = 6.dp
    val registerErrorTop = 5.dp
    val footerSize = 13.5.sp
    val footerGap = 5.dp
    val legalSize = 12.sp
    val legalGapHorizontal = 14.dp
    val legalGapVertical = 6.dp
    val legalTopPadding = 10.dp

    // Phone field: `padding:0 12px;gap:6px`, flag 18, dial 14/600, chevron 12
    val phonePrefixPadding = 12.dp
    val phoneFlag = 18.dp
    val phoneDialSize = 14.sp
    val phoneChevron = 12.dp
    val phoneTextPadding = 12.dp

    // Dropdown: option `padding:13px 16px`, chevron 14, list `margin-top:6px`, shadow `0 12px 30px rgba(31,34,51,.12)`
    val dropdownChevron = 14.dp
    val optionVertical = 13.dp
    val optionHorizontal = 16.dp
    val optionSize = 14.sp
    const val listShadowAlpha = 0.12f

    // Login spacing: field → button 18, footer margin-top 22, flex min 24; register: 18 / 16
    val loginButtonTop = 18.dp
    val loginFooterTop = 22.dp
    val loginLegalMin = 24.dp
    val registerFooterTop = 18.dp
    val registerLegalTop = 16.dp

    // OTP: icon box 76/radius 24/icon 34, `margin:34px 0 22px`; title 23; boxes 64 high/radius 16/gap 12, `margin:30px 0 10px`
    val otpIconBox = 76.dp
    val otpIconBoxRadius = 24.dp
    val otpIcon = 34.dp
    val otpIconTop = 34.dp
    val otpIconBottom = 22.dp
    val otpTitleSize = 23.sp
    val otpTitleLineHeight = 30.sp
    val otpTitleBottom = 8.dp
    val otpHeaderSize = 15.sp
    val otpSentSize = 13.5.sp
    val otpSentLineHeight = 22.sp
    val otpExpiresSize = 12.5.sp
    val otpBoxHeight = 64.dp
    val otpBoxRadius = 16.dp
    val otpBoxGap = 12.dp
    val otpBoxTop = 30.dp
    val otpBoxBottom = 10.dp
    val otpDigitSize = 24.sp
    val otpFocusRing = 4.dp
    const val otpFocusRingAlpha = 0.12f
    const val otpBlockedAlpha = 0.5f
    val otpWrongSize = 12.5.sp
    const val otpBlockedBgAlpha = 0.10f
    val otpBlockedPaddingV = 12.dp
    val otpBlockedPaddingH = 14.dp
    val otpBlockedIcon = 18.dp
    val otpBlockedTextSize = 12.5.sp
    val otpBlockedLineHeight = 19.sp
    val otpBlockedTop = 4.dp
    val otpButtonTop = 22.dp
    val otpResendTop = 20.dp
    val otpResendSize = 13.5.sp
    val otpCountingSize = 13.sp
    val otpResendPadding = 10.dp

    // Dialog: `border-radius:24px;padding:26px 22px 20px`, icon circle 56, title 17, body 13.5, primary 50, secondary 46
    val dialogPaddingTop = 26.dp
    val dialogPaddingHorizontal = 22.dp
    val dialogPaddingBottom = 20.dp
    val dialogIconBottom = 14.dp
    val dialogIconTextSize = 24.sp
    val dialogTitleSize = 17.sp
    val dialogTitleBottom = 8.dp
    val dialogBodySize = 13.5.sp
    val dialogBodyLineHeight = 22.sp
    val dialogBodyBottom = 22.dp
    val dialogPrimaryHeight = 50.dp
    val dialogPrimarySize = 14.5.sp
    val dialogSecondaryHeight = 46.dp
    val dialogSecondarySize = 14.sp
    val dialogButtonGap = 8.dp
    val dialogOuterPadding = 28.dp
    const val dialogDangerBgAlpha = 0.12f

    // Country sheet: `border-radius:26px 26px 0 0;padding:10px 20px 34px;height:68%`, handle 40x5, close 36, search 46/radius 12
    const val sheetHeightFraction = 0.68f
    val sheetPaddingTop = 10.dp
    val sheetPaddingHorizontal = 20.dp
    val sheetPaddingBottom = 34.dp
    val sheetHandleHeight = 5.dp
    val sheetHandleRadius = 3.dp
    val sheetHandleBottom = 14.dp
    val sheetTitleSize = 16.sp
    val sheetClose = 36.dp
    val sheetSearchHeight = 46.dp
    val sheetSearchRadius = 12.dp
    val sheetSearchPadding = 14.dp
    val sheetSearchIcon = 16.dp
    val sheetSearchBottom = 10.dp
    val sheetRowVertical = 14.dp
    val sheetRowHorizontal = 4.dp
    val sheetFlag = 22.dp
    val sheetNameSize = 14.5.sp
    val sheetDialSize = 13.5.sp
    val sheetCheck = 18.dp
}
