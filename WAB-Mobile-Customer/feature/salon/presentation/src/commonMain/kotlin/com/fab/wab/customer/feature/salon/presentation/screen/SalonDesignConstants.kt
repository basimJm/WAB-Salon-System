package com.fab.wab.customer.feature.salon.presentation.screen

import androidx.compose.ui.unit.dp

/**
 * Values of `design/WAB 03 Salon.dc.html` (S07, S07a, S07b, S08/S09, S10) that have no theme token.
 * Design px = dp. Only this file (and the theme) may hold dimension literals.
 */
internal object SalonDesign {
    // S07 header block
    val coverHeight = 180.dp
    val logoSize = 96.dp
    val logoBorder = 4.dp
    val logoOverlap = 50.dp
    /** 96 px logo + 4 px ring on each side (CSS content-box). */
    val logoOuter = 104.dp
    val logoShadow = 8.dp
    const val LOGO_SHADOW_ALPHA = 0.15f
    val statusDot = 6.dp
    val ratingStarSmall = 13.dp
    val locationIcon = 15.dp
    val locationGap = 6.dp

    // S07 contact + description + hours
    val contactButtonHeight = 48.dp
    val contactIcon = 18.dp
    val descriptionTop = 18.dp
    const val DESCRIPTION_LINES = 3
    val hoursCardRadius = 18.dp
    val hoursIcon = 18.dp
    val hoursChevron = 14.dp
    const val CHEVRON_EXPANDED_ROTATION = 180f
    val hoursRowPadding = 9.dp
    val closureRadius = 12.dp
    val closureIcon = 16.dp

    // S07 staff row
    val staffSectionTop = 24.dp
    val staffItemWidth = 72.dp
    val staffAvatar = 64.dp
    val staffDot = 14.dp
    val staffDotBorder = 2.5.dp
    val staffDotInset = 2.dp

    // S07 reviews, services, gallery
    val sectionTop = 26.dp
    const val REVIEW_PREVIEW_COUNT = 3
    const val REVIEW_PREVIEW_LINES = 2
    val reviewEmptyPadding = 22.dp
    val actionButtonHeight = 46.dp
    val serviceImage = 52.dp
    val serviceImageRadius = 12.dp
    val galleryGap = 3.dp
    val galleryPlayBadge = 34.dp
    val galleryPlayIcon = 14.dp
    const val VIDEO_SCRIM_ALPHA = 0.2f
    const val PLAY_BADGE_ALPHA = 0.9f
    val bookBarBottom = 30.dp

    // S07 loading placeholder
    val shimmerLogoOuter = 100.dp
    val shimmerLogoOverlap = 58.dp
    val shimmerTitleWidth = 170.dp
    val shimmerTitleHeight = 14.dp
    val shimmerSubtitleWidth = 220.dp
    val shimmerSubtitleHeight = 12.dp
    val shimmerButtonHeight = 46.dp
    val shimmerBlockHeight = 70.dp
    val shimmerCircle = 62.dp
    val shimmerTallHeight = 120.dp
    const val SHIMMER_CIRCLES = 4

    // Universal states as drawn on S07 / S08
    val stateCircle = 120.dp
    val stateIcon = 50.dp
    val reviewsStateCircle = 110.dp
    val reviewsStateIcon = 46.dp
    val statePadding = 36.dp

    // S07a staff sheet
    val staffSheetAvatar = 104.dp
    val staffAvatarShadow = 10.dp
    const val STAFF_AVATAR_SHADOW_ALPHA = 0.2f
    val statGridVertical = 18.dp
    val dayChipRadius = 10.dp
    val dayChipPaddingH = 11.dp
    val dayChipPaddingV = 6.dp
    const val DASH_LENGTH = 6f
    const val DASH_GAP = 4f
    val serviceChipPaddingH = 12.dp
    val serviceChipPaddingV = 7.dp
    val staffShimmerName = 120.dp
    val staffShimmerNameHeight = 16.dp
    val staffShimmerBlock = 70.dp
    val staffShimmerTall = 90.dp
    val sheetBottom = 30.dp

    // S07b service sheet
    val serviceMediaTile = 110.dp
    val serviceDurationIcon = 14.dp
    val modalSheetBottom = 34.dp

    // S08 / S09 reviews + add review
    val summaryRadius = 18.dp
    val summaryStar = 16.dp
    val reviewShimmerHeight = 110.dp
    const val REVIEW_SHIMMER_COUNT = 4
    val successBadge = 72.dp
    val successIcon = 32.dp
    val doneButtonHeight = 50.dp
    val commentFieldHeight = 110.dp

    // S10 media viewer
    const val MEDIA_CLOSE_ALPHA = 0.12f
    const val MEDIA_HINT_ALPHA = 0.65f
    val mediaCloseButton = 44.dp
    val mediaHintBottom = 40.dp
}
