package com.fab.wab.customer.feature.booking.presentation.screen

import androidx.compose.ui.unit.Dp
import androidx.compose.ui.unit.TextUnit
import androidx.compose.ui.unit.TextUnitType

/**
 * Design values of `design/WAB 04 Booking Flow.dc.html` that have no design-system token yet (px = dp).
 * Every entry names the CSS it comes from so a future token can replace it. Values use the `Dp(...)` / `TextUnit(...)`
 * constructors: the hardcoded policy only exempts plain numbers in `*Constants.kt`, never `.dp` / `.sp` extensions.
 */
internal object BookingDesignConstants {
    /** Header: `height:52px`, back button `44px`, title `15.5px`, salon name `11.5px`. */
    val headerHeight = Dp(52f)
    val backButton = Dp(44f)

    /** Stepper: bars `height:4px; border-radius:2px; gap:5px`, block padding `6px 20px 14px`. */
    val stepBarHeight = Dp(4f)
    val stepBarRadius = Dp(2f)
    val stepBarGap = Dp(5f)

    /** Step 0 bride card: `border-radius:18px`, icon box `44px / radius 14px`, track `48x28 / padding 3`, knob `22px`. */
    val brideCardRadius = Dp(18f)
    val brideIconBox = Dp(44f)
    val switchTrackWidth = Dp(48f)
    val switchTrackHeight = Dp(28f)
    val switchTrackPadding = Dp(3f)
    val switchKnob = Dp(22f)

    /** Selection cards (`card(sel)`): `padding:12px 14px; border-radius:16px; border:1.5px`, check box `22px / radius 7px`. */
    val checkBox = Dp(22f)
    val checkBoxRadius = Dp(7f)
    val checkIcon = Dp(14f)
    val serviceShimmerHeight = Dp(74f)
    val staffShimmerHeight = Dp(72f)
    val shimmerGap = Dp(10f)

    /** Services error state: `padding:70px 20px`, circle `100px`, icon `42px`, button `height:46px; padding:0 28px`. */
    val errorTopPadding = Dp(70f)
    val errorCircle = Dp(100f)
    val errorIcon = Dp(42f)
    val errorButtonHeight = Dp(46f)
    val errorButtonPadding = Dp(28f)

    /** Calendar: container `radius 20px`, nav buttons `36px / radius 10px`, day cell `height:38px; radius 11px`, legend `10px / 3px`. */
    val calendarRadius = Dp(20f)
    val monthButton = Dp(36f)
    val monthButtonRadius = Dp(10f)
    val dayCellHeight = Dp(38f)
    val dayCellRadius = Dp(11f)
    val dayCellGap = Dp(4f)
    val legendSquare = Dp(10f)
    val legendRadius = Dp(3f)
    val legendGap = Dp(14f)
    val closureIcon = Dp(14f)

    /** Slot chips: `min-height:42px; padding:4px 2px; radius 12px; gap 8px`, four per row, "Full" `9.5px`. */
    val slotHeight = Dp(42f)
    val slotRadius = Dp(12f)
    val slotPaddingV = Dp(4f)
    val slotPaddingH = Dp(2f)
    val slotFullTextSize = TextUnit(9.5f, TextUnitType.Sp)
    val slotFullLineHeight = TextUnit(12f, TextUnitType.Sp)
    val noSlotsPadding = Dp(22f)

    /** Staff: avatar `48px`, radio `20px` (`border:6px` selected / `1.5px` faint). */
    val staffAvatar = Dp(48f)
    val radioSize = Dp(20f)
    val radioSelectedBorder = Dp(6f)

    /** Companions: choice cards `height:96px; radius 18px`, initial circle `40px`, remove button `34px`, bride tag `10.5px`. */
    val companionCardRadius = Dp(18f)
    val initialCircle = Dp(40f)
    val removeButton = Dp(34f)
    val dashLength = Dp(6f)
    val tagTextSize = TextUnit(10.5f, TextUnitType.Sp)
    val tagLineHeight = TextUnit(14f, TextUnitType.Sp)
    val tagPaddingH = Dp(8f)

    /** Summary: person card `radius 18px; border 1px`, total amount `18px`, bullet gap `8px`. */
    val summaryCardRadius = Dp(18f)

    /** S17: halo `120px`, badge `84px`, check `40px`, body `max-width:290px`, copy button `height 38px; padding 0 14px; radius 10px`. */
    val successHalo = Dp(120f)
    val successBadge = Dp(84f)
    val successCheck = Dp(40f)
    val successBodyMaxWidth = Dp(290f)
    val successTopPadding = Dp(60f)
    val successBottomPadding = Dp(40f)
    val successSidePadding = Dp(28f)
    val successRefGap = Dp(34f)
    val copyButtonHeight = Dp(38f)
    val copyButtonRadius = Dp(10f)
    val referenceLetterSpacing = TextUnit(1f, TextUnitType.Sp)
    val backHomeHeight = Dp(50f)

    /**
     * `radial-gradient(circle, rgba(168,85,247,.22), transparent 70%)`; `rgba(244,167,196,.25)` bride icon box;
     * disabled card `opacity:.5`.
     */
    const val HALO_ALPHA = 0.22f
    const val HALO_RADIUS_FRACTION = 0.7f
    const val BRIDE_TINT_ALPHA = 0.25f
    const val BRIDE_TAG_ALPHA = 0.30f
    const val DISABLED_CARD_ALPHA = 0.5f
    const val LIMIT_CARD_ALPHA = 0.6f
    const val MONTH_BUTTON_DISABLED_ALPHA = 0.35f
    const val DANGER_SOFT_ALPHA = 0.10f
    const val VIP_START_ALPHA = 0.06f
    const val VIP_END_ALPHA = 0.12f
}
