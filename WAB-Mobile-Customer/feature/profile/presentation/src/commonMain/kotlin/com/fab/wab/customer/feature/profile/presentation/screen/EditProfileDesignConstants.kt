package com.fab.wab.customer.feature.profile.presentation.screen

import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp

/**
 * Values of `design/WAB 06 Account.dc.html` (S22 Edit personal info: fields, phone prefix, note, save bar) that have
 * no design-system token. Design px = dp. Everything else reads `AppTheme` tokens.
 */
internal object EditProfileDesign {
    // Form: `padding:8px 20px 20px;gap:14px`
    val formTop = 8.dp
    val formHorizontal = 20.dp
    val formBottom = 20.dp
    val formGap = 14.dp

    // Field: label 12/600 accent `margin-bottom:6px`; box 52 radius 14 border 1.5; input 15px `padding:0 12px`
    val labelSize = 12.sp
    val labelBottom = 6.dp
    val inputSize = 15.sp
    val inputHorizontal = 12.dp
    val chevron = 14.dp
    val errorSize = 11.5.sp
    val errorTop = 5.dp

    // Phone prefix: `gap:6px;padding:0 12px;border-inline-end:1px solid var(--line)` 14/600, flag 18
    val prefixGap = 6.dp
    val prefixTextSize = 14.sp
    val flag = 18.dp

    // Phone note: `gap:10px;padding:12px 14px;border-radius:14px;background:var(--soft)` 12.5 accent lh 1.5, icon 18
    val noteGap = 10.dp
    val noteVertical = 12.dp
    val noteHorizontal = 14.dp
    val noteTextSize = 12.5.sp
    val noteLineHeight = 19.sp
    val noteIcon = 18.dp

    // Save bar: `padding:12px 20px 30px;border-top:1px solid var(--line)`; button 54 radius 14 15/600; spinner 18 / 2.5
    val barTop = 12.dp
    val barBottom = 30.dp
    val saveTextSize = 15.sp
    val spinner = 18.dp
    val spinnerStroke = 2.5.dp
    const val spinnerTrackAlpha = 0.4f
}
