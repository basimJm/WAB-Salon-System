package com.fab.wab.customer.feature.notifications.presentation.screen

import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp

/**
 * Values of `design/WAB 06 Account.dc.html` (S19 Notifications: list, chips, filter sheet, popup, states) that have
 * no design-system token. Design px = dp. Everything else reads `AppTheme` tokens.
 */
internal object NotificationsDesign {
    // Top bar filter button: `width:44px;height:44px`, icon 21, active dot `top:9px;inset-inline-end:9px;width:8px`
    val filterIcon = 21.dp
    val filterDot = 8.dp
    val filterDotInset = 11.dp

    // Active chips: `gap:8px;padding:6px 20px 10px`; chip `height:34px;padding-inline:12px 6px;border-radius:17px`
    val chipsTop = 6.dp
    val chipsBottom = 10.dp
    val chipHeight = 34.dp
    val chipTextSize = 12.5.sp
    val chipRemove = 22.dp
    val chipRemoveIcon = 11.dp
    val chipRemoveAlpha = 0.14f

    // List: `padding:4px 20px 24px;gap:8px`
    val listTop = 4.dp
    val listHorizontal = 20.dp
    val listBottom = 24.dp
    val listGap = 8.dp

    // Item: `padding:14px;border-radius:16px;gap:12px`, unread border `rgba(168,85,247,.35)`
    val itemPadding = 14.dp
    val unreadBorderAlpha = 0.35f
    val iconBox = 42.dp
    val iconBoxRadius = 13.dp
    val titleSize = 14.sp
    val titleLineHeight = 20.sp
    val timeSize = 11.sp
    val bodySize = 12.5.sp
    val bodyLineHeight = 19.sp
    val bodyTop = 3.dp
    val bodyLines = 2
    val unreadDot = 8.dp
    val unreadDotTop = 6.dp

    // Shimmer rows: `height:84px;border-radius:16px`, five on first load, one while paging
    val shimmerHeight = 84.dp
    val shimmerCount = 5

    // Placeholder (empty / error): `padding:30px 24px`, circle 110, icon 46, title 16/700 `margin-bottom:18px`
    val placeholderVertical = 30.dp
    val placeholderHorizontal = 24.dp
    val placeholderCircle = 110.dp
    val placeholderIcon = 46.dp
    val placeholderCircleBottom = 20.dp
    val placeholderTitleSize = 16.sp
    val placeholderTitleBottom = 18.dp

    // Buttons: retry `height:46px;padding:0 28px` 14/600; sheet buttons `height:52px` 14.5/600 (reset flex:1, apply flex:2)
    val retryHeight = 46.dp
    val retryHorizontal = 28.dp
    val retryTextSize = 14.sp
    val sheetButtonHeight = 52.dp
    val sheetButtonTextSize = 14.5.sp
    val applyWeight = 2f
    val sheetButtonGap = 10.dp

    // Sheet: `padding:10px 20px 34px`, title 16.5/700 `margin-bottom:12px`
    val sheetHorizontal = 20.dp
    val sheetBottom = 34.dp
    val sheetTitleSize = 16.5.sp
    val sheetTitleBottom = 12.dp

    // Filter sheet: label 12/600 accent `margin-bottom:6px`; field `height:48px;border-radius:14px;border:1.5px` 14px text
    val fieldLabelSize = 12.sp
    val fieldLabelBottom = 6.dp
    val fieldHeight = 48.dp
    val fieldTextSize = 14.sp
    val dateFieldPadding = 12.dp
    val searchFieldPadding = 14.dp
    val dateRowBottom = 12.dp
    val searchBottom = 18.dp
    val fieldErrorSize = 11.5.sp
    val fieldErrorTop = 5.dp

    // Popup: header `gap:12px;margin-bottom:12px`, time 12 `margin-top:12px`, body 14 lh 1.8 `margin-bottom:18px`, CTA 52 15/600
    val popupHeaderBottom = 12.dp
    val popupTimeSize = 12.sp
    val popupTimeTop = 12.dp
    val popupBodySize = 14.sp
    val popupBodyLineHeight = 25.sp
    val popupBodyBottom = 18.dp
    val popupCtaHeight = 52.dp
    val popupCtaTextSize = 15.sp
}
