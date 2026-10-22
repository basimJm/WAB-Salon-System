package com.fab.wab.customer.feature.home.presentation.screen

import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp

/**
 * Values of `design/WAB 02 Discovery.dc.html` (S03 Home, shared by S04/S05/S06) that have no design-system token.
 * Design px = dp / sp. Everything else on these screens comes from `AppTheme`.
 */
object DiscoveryDesign {
    // Shared text sizes (Poppins / IBM Plex Sans Arabic unless noted)
    val TEXT_10_5 = 10.5.sp
    val TEXT_11_5 = 11.5.sp
    val TEXT_12 = 12.sp
    val TEXT_12_5 = 12.5.sp
    val TEXT_13 = 13.sp
    val TEXT_13_5 = 13.5.sp
    val TEXT_14 = 14.sp
    val TEXT_14_5 = 14.5.sp
    val TEXT_16 = 16.sp
    val TEXT_17 = 17.sp
    val TEXT_21 = 21.sp
    const val LINE_HEIGHT_NORMAL = 1.3f
    const val LINE_HEIGHT_1_5 = 1.5f
    const val LINE_HEIGHT_1_6 = 1.6f

    // Top bar (S04 / S05 / S06): height = sizes.topBarHeight
    val TOP_BAR_PADDING_H = 12.dp
    val TOP_BAR_BACK_SIZE = 44.dp
    val TOP_BAR_ICON = 22.dp

    // Header
    val HEADER_PADDING_TOP = 8.dp
    val BELL_SIZE = 44.dp
    val BELL_ICON = 21.dp
    val BADGE_MIN_WIDTH = 20.dp
    val BADGE_HEIGHT = 20.dp
    val BADGE_PADDING_H = 5.dp
    val BADGE_BORDER = 2.dp
    val BADGE_OFFSET_TOP = 2.dp
    val BADGE_OFFSET_END = 4.dp

    // Banner
    val BANNER_HEIGHT = 150.dp
    val BANNER_SHADOW = 12.dp
    const val BANNER_SHADOW_ALPHA = 0.15f
    val BANNER_DOT_SIZE = 6.dp
    val BANNER_DOT_ACTIVE_WIDTH = 18.dp
    val BANNER_DOT_GAP = 5.dp
    val BANNER_DOT_BOTTOM = 10.dp
    const val BANNER_DOT_INACTIVE_ALPHA = 0.5f
    const val BANNER_AUTO_SWIPE_MS = 3500

    // Static search button
    val SEARCH_HEIGHT = 50.dp
    val SEARCH_ICON = 18.dp

    // Gender tabs
    val TABS_PADDING = 5.dp
    val TAB_HEIGHT = 40.dp
    val TAB_RADIUS = 12.dp
    val TAB_SHADOW = 6.dp
    const val TAB_SHADOW_ALPHA = 0.25f

    // Section headers
    val SECTION_TOP_FIRST = 24.dp
    val SECTION_TOP = 26.dp

    // Service tile
    val SERVICE_TILE_WIDTH = 136.dp
    val SERVICE_IMAGE_HEIGHT = 96.dp
    val SERVICE_IMAGE_RADIUS = 18.dp
    const val SERVICE_DESC_LINES = 2

    // Salon card (carousel)
    val SALON_CARD_WIDTH = 250.dp
    val SALON_CARD_RADIUS = 20.dp
    val SALON_IMAGE_HEIGHT = 118.dp
    const val SALON_CARD_SHADOW_ALPHA = 0.05f
    val FAVORITE_SIZE = 34.dp
    val FAVORITE_ICON = 17.dp
    const val FAVORITE_BG_ALPHA = 0.94f
    val FAVORITE_SHADOW = 2.dp
    const val FAVORITE_SHADOW_ALPHA = 0.12f
    val DISTANCE_PILL_RADIUS = 10.dp
    const val DISTANCE_PILL_ALPHA = 0.72f
    val SALON_BODY_GAP = 5.dp
    val STAR_ICON = 13.dp
    val RATING_GAP = 3.dp
    val PIN_ICON = 12.dp
    val STATUS_DOT = 6.dp

    // Salon row (S04 list)
    val ROW_RADIUS = 18.dp
    val ROW_SHADOW = 4.dp
    const val ROW_SHADOW_ALPHA = 0.04f
    val ROW_IMAGE = 88.dp
    val ROW_HEART = 30.dp
    val ROW_HEART_ICON = 18.dp

    // Nearest placeholders
    val NEAR_OFF_PADDING_V = 22.dp
    val NEAR_OFF_ICON_CIRCLE = 54.dp
    val NEAR_OFF_TEXT_MAX_WIDTH = 260.dp
    val NEAR_OFF_BUTTON_HEIGHT = 44.dp
    val NEAR_OFF_BUTTON_PADDING_H = 22.dp
    val NEAR_OFF_BUTTON_RADIUS = 12.dp
    val PLACEHOLDER_BUTTON_RADIUS = 14.dp
    const val DASH_LENGTH = 6f
    const val DASH_GAP = 4f

    // Full-page placeholder (error / empty)
    val PLACEHOLDER_PADDING_V = 30.dp
    val PLACEHOLDER_PADDING_H_HOME = 36.dp
    val PLACEHOLDER_CIRCLE = 120.dp
    val PLACEHOLDER_ICON = 50.dp
    val PLACEHOLDER_BUTTON_HEIGHT = 48.dp
    val PLACEHOLDER_BUTTON_PADDING_H = 30.dp
    val PLACEHOLDER_BODY_BOTTOM = 22.dp

    // Home shimmer
    val SHIMMER_NAME_WIDTH = 90.dp
    val SHIMMER_NAME_HEIGHT = 12.dp
    val SHIMMER_HELLO_WIDTH = 150.dp
    val SHIMMER_HELLO_HEIGHT = 20.dp
    val SHIMMER_TITLE_WIDTH = 110.dp
    val SHIMMER_TITLE_WIDTH_WIDE = 150.dp
    val SHIMMER_TITLE_HEIGHT = 16.dp
    val SHIMMER_SERVICE_WIDTH = 130.dp
    val SHIMMER_SERVICE_HEIGHT = 150.dp
    val SHIMMER_SALON_WIDTH = 248.dp
    val SHIMMER_SALON_HEIGHT = 230.dp
    val SHIMMER_TABS_HEIGHT = 46.dp
    const val SHIMMER_ROW_COUNT = 3
    val SHIMMER_RADIUS_22 = 22.dp
    val SHIMMER_RADIUS_14 = 14.dp
}
