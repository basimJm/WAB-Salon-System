package com.fab.wab.customer.designsystem.theme

import androidx.compose.runtime.Immutable

/** Animation durations in milliseconds. */
@Immutable
data class MotionTokens(
    val fast: Int = 120,
    val standard: Int = 220,
    val slow: Int = 360,
    val shimmerCycle: Int = 1400,
    val bannerAutoSwipe: Int = 4000,
    /** CUS-100: the brand logo Lottie plays in this time (ms), whatever the file's own length. */
    val logoReveal: Int = 2000,
)

val DefaultMotion = MotionTokens()
