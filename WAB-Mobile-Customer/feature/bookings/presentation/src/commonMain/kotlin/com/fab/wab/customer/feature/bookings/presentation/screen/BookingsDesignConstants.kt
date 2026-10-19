package com.fab.wab.customer.feature.bookings.presentation.screen

import androidx.compose.ui.unit.Dp
import androidx.compose.ui.unit.TextUnit
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp

/**
 * Values of `design/WAB 05 Bookings.dc.html` (S14, S15, S18) that have no design-system token yet.
 * Design px = dp. Everything else in the feature reads `AppTheme` tokens.
 */
internal object BookingsDesign {
    // Radii (14 / 16 / 22 come from ShapeTokens)
    val cardRadius = 18.dp
    val statusBlockRadius = 20.dp
    val dialogRadius = 24.dp
    val copyButtonRadius = 10.dp
    val contactButtonRadius = 12.dp
    val staffCommentRadius = 12.dp
    val tabRadius = 12.dp
    val tabsPadding = 5.dp

    // Sizes
    val salonThumb = 52.dp
    val contactButton = 42.dp
    val copyButtonHeight = 36.dp
    val cancelButtonHeight = 52.dp
    val rateButtonHeight = 52.dp
    val submitButtonHeight = 54.dp
    val dialogConfirmHeight = 50.dp
    val dialogDismissHeight = 46.dp
    val closeButton = 44.dp
    val cardIcon = 14.dp
    val searchIcon = 18.dp
    val reasonIcon = 18.dp
    val contactIcon = 18.dp
    val ratingImage = 84.dp
    val doneCircle = 84.dp
    val doneIcon = 40.dp
    val starLarge = 40.dp
    val starSmall = 30.dp
    val staffAvatar = 48.dp
    val commentHeight = 120.dp
    val staffCommentHeight = 44.dp
    val listShimmerHeight = 124.dp
    val detailsShimmerHeights = listOf(120.dp, 80.dp, 150.dp, 110.dp)
    val bottomBarPadding = 30.dp
    val placeholderVerticalPadding = 30.dp
    val placeholderButtonHeight = 48.dp
    val placeholderButtonPadding = 30.dp
    val dialogPadding = 22.dp
    val dialogTopPadding = 26.dp
    val dialogMoneyBottomPadding = 22.dp
    val doneTitleBottomPadding = 26.dp
    val salonStepBottomPadding = 18.dp
    val lineVerticalPadding = 3.dp
    val dashLength = 6f
    val dashGap = 4f
    val strokeCenterDivisor = 2f

    /** Design `listPh` / `dError`: 110 px circle, 46 px icon, 16 px title, 13 px body, 48 px button with 30 px side padding. */
    val listPlaceholder = PlaceholderSpec(
        circle = 110.dp, icon = 46.dp, title = 16.sp, body = 13.sp,
        buttonHeight = 48.dp, buttonPadding = 30.dp, horizontalPadding = 24.dp,
    )

    /** Design `isGuest`: 120 px circle, 50 px icon, 17 px title, 13.5 px body, 50 px button with 34 px side padding. */
    val guestPlaceholder = PlaceholderSpec(
        circle = 120.dp, icon = 50.dp, title = 17.sp, body = 13.5.sp,
        buttonHeight = 50.dp, buttonPadding = 34.dp, horizontalPadding = 36.dp,
    )

    /** Design `dError`: list placeholder with a 46 px Retry button and 28 px side padding, 36 px screen padding. */
    val errorPlaceholder = listPlaceholder.copy(buttonHeight = 46.dp, buttonPadding = 28.dp, horizontalPadding = 36.dp)

    // Font sizes that fall between the typography tokens
    val fontChip = 10.5.sp
    val fontLabel = 11.5.sp
    val fontCaption = 12.5.sp
    val fontBody = 13.sp
    val fontBodyPlus = 13.5.sp
    val fontTitle = 14.5.sp
    val fontAction = 15.sp
    val fontDialogTitle = 17.sp
    val fontHeading = 20.sp
    val fontDialogIcon = 24.sp
    val referenceLetterSpacing = 0.5.sp
    val lineHeightBody = 20.sp
    val lineHeightBodyPlus = 22.sp

    const val SHIMMER_CARDS = 4
    const val REFERENCE_PREFIX = "#"
    const val BULLET = "•"
    const val DIALOG_ICON_TEXT = "!"
    const val WHEN_SEPARATOR = " · "
}

/** Sizes of one placeholder variant (circle, icon, title / body font sizes, action button). */
internal data class PlaceholderSpec(
    val circle: Dp,
    val icon: Dp,
    val title: TextUnit,
    val body: TextUnit,
    val buttonHeight: Dp,
    val buttonPadding: Dp,
    val horizontalPadding: Dp,
)
