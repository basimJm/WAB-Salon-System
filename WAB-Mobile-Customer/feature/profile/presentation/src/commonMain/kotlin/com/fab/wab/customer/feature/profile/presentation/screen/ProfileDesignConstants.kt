package com.fab.wab.customer.feature.profile.presentation.screen

import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp

/**
 * Values of `design/WAB 06 Account.dc.html` (S21 Profile: header card, sections, rows, toggle, buttons, sheets,
 * dialogs) that have no design-system token. Design px = dp. Everything else reads `AppTheme` tokens.
 */
internal object ProfileDesign {
    // Scroll area: `padding:8px 20px 24px`
    val screenTop = 8.dp
    val screenHorizontal = 20.dp
    val screenBottom = 24.dp

    // Header card: `gap:14px;padding:16px;border-radius:22px;background:var(--surface);margin-bottom:22px`
    val headerGap = 14.dp
    val headerBottom = 22.dp
    val avatar = 68.dp
    val avatarIcon = 52.dp
    val avatarIconAlpha = 0.9f
    val cameraBadge = 24.dp
    val cameraBadgeBorder = 2.dp
    val cameraIcon = 12.dp
    val guestAvatar = 60.dp
    val guestInitialSize = 22.sp
    val nameSize = 16.5.sp
    val emailSize = 12.5.sp
    val editHeight = 36.dp
    val editHorizontal = 14.dp
    val editRadius = 10.dp
    val editTextSize = 12.5.sp

    // Sections: title 12/700 faint `margin:0 4px 8px`; card `border-radius:18px;margin-bottom:20px`
    val sectionTitleSize = 12.sp
    val sectionTitleHorizontal = 4.dp
    val sectionTitleBottom = 8.dp
    val sectionRadius = 18.dp
    val sectionGap = 20.dp

    // Rows: `min-height:54px;padding:0 14px;gap:12px`; icon box 34 radius 10 icon 17; label 14; value 12.5; chevron 15
    val rowMinHeight = 54.dp
    val rowHorizontal = 14.dp
    val rowIconBox = 34.dp
    val rowIconBoxRadius = 10.dp
    val rowIcon = 17.dp
    val rowValueSize = 12.5.sp
    val chevron = 15.dp

    // Toggle: track 44x26 radius 13 padding 3; knob 20 white with `0 2px 5px rgba(0,0,0,.2)`
    val toggleWidth = 44.dp
    val toggleHeight = 26.dp
    val togglePadding = 3.dp
    val toggleKnob = 20.dp
    val toggleKnobShadow = 2.dp
    val toggleKnobShadowAlpha = 0.2f

    // Session buttons: login / logout 52 15/600; delete 46 13.5/600 `margin-top:8px`; version 11.5 faint `margin-top:14px`
    val buttonHeight = 52.dp
    val buttonTextSize = 15.sp
    val deleteHeight = 46.dp
    val deleteTextSize = 13.5.sp
    val deleteTop = 8.dp
    val versionSize = 11.5.sp
    val versionTop = 14.dp

    // Sheets: `padding:10px 20px 34px`, title 16.5/700 centred `margin-bottom:12px`
    val sheetHorizontal = 20.dp
    val sheetBottom = 34.dp
    val sheetTitleSize = 16.5.sp
    val sheetTitleBottom = 12.dp

    // Option rows: `min-height:54px;padding:0 4px;gap:12px` 14.5; icon box 36 radius 10 icon 18; check 18; danger bg alpha .1
    val optionHorizontal = 4.dp
    val optionTextSize = 14.5.sp
    val optionIconBox = 36.dp
    val optionIcon = 18.dp
    val optionCheck = 18.dp
    val optionDangerAlpha = 0.1f

    // Nickname sheet: label 12/600 accent mb 6; input 52 radius 14 border 1.5 mb 14; gender buttons 48 gap 10 mb 18 14/600
    val nickLabelSize = 12.sp
    val nickLabelBottom = 6.dp
    val nickFieldBottom = 14.dp
    val nickFieldTextSize = 15.sp
    val genderHeight = 48.dp
    val genderGap = 10.dp
    val genderBottom = 18.dp
    val genderTextSize = 14.sp

    // Dialog: `padding:26px 22px 20px;border-radius:24px`, "!" circle 56 24/700, title 17, body 13.5 lh 1.7, ok 50, cancel 46
    val dialogOuterPadding = 28.dp
    val dialogRadius = 24.dp
    val dialogTop = 26.dp
    val dialogHorizontal = 22.dp
    val dialogBottomPadding = 20.dp
    val dialogIcon = 56.dp
    val dialogIconBottom = 14.dp
    val dialogIconTextSize = 24.sp
    val dialogIconAlpha = 0.12f
    val dialogTitleSize = 17.sp
    val dialogTitleBottom = 8.dp
    val dialogBodySize = 13.5.sp
    val dialogBodyLineHeight = 23.sp
    val dialogBodyBottom = 22.dp
    val dialogOkHeight = 50.dp
    val dialogOkTextSize = 14.5.sp
    val dialogCancelHeight = 46.dp
    val dialogCancelTextSize = 14.sp
    val dialogButtonGap = 8.dp
}
