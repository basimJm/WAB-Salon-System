package com.fab.wab.customer.feature.favorites.presentation.screen

import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp

/**
 * Values of `design/WAB 06 Account.dc.html` (S20 Favorites: header, cards, placeholders) that have no design-system
 * token. Design px = dp. Everything else reads `AppTheme` tokens.
 */
internal object FavoritesDesign {
    // Header: `padding:8px 20px 14px`; hello 12.5 muted; title Playfair 22/700 (= typography.headlineMedium)
    val screenHorizontal = 20.dp
    val headerTop = 8.dp
    val headerBottom = 14.dp
    val helloSize = 12.5.sp

    // List: `padding:0 20px 20px;gap:12px`
    val listBottom = 20.dp
    val listGap = 12.dp

    // Card: `padding:12px;border:1px solid var(--line);border-radius:18px;gap:12px`; image 88 radius 14; column gap 4
    val cardRadius = 18.dp
    val cardPadding = 12.dp
    val cardGap = 12.dp
    val cardImage = 88.dp
    val cardColumnGap = 4.dp
    val nameSize = 14.5.sp
    val heartButton = 30.dp
    val heartIcon = 18.dp
    val ratingGap = 3.dp
    val ratingSize = 12.sp
    val starIcon = 12.dp
    val metaSize = 12.sp
    val statusGap = 6.dp
    val statusDot = 6.dp
    val statusSize = 11.5.sp

    // Shimmer cards: `height:112px;border-radius:18px`, four of them
    val shimmerHeight = 112.dp
    const val shimmerCount = 4

    // Placeholder (guest / empty / error): `padding:30px 24px`, circle 110, icon 46, title 16/700 mb 8, body 13 lh 1.6 mb 20
    val placeholderVertical = 30.dp
    val placeholderHorizontal = 24.dp
    val placeholderCircle = 110.dp
    val placeholderIcon = 46.dp
    val placeholderCircleBottom = 20.dp
    val placeholderTitleSize = 16.sp
    val placeholderTitleBottom = 8.dp
    val placeholderBodySize = 13.sp
    val placeholderBodyLineHeight = 21.sp
    val placeholderBodyBottom = 20.dp

    // Placeholder button: `height:48px;padding:0 30px;border-radius:14px` 14/600
    val buttonHeight = 48.dp
    val buttonHorizontal = 30.dp
    val buttonTextSize = 14.sp
}
