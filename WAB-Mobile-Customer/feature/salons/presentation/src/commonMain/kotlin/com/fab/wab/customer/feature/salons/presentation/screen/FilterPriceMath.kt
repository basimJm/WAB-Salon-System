package com.fab.wab.customer.feature.salons.presentation.screen

import kotlin.math.abs
import kotlin.math.roundToInt

/** Which thumb a press moves (design `slide()`): the nearer one, the lower one on a tie. */
enum class PriceThumb { Min, Max }

/** 0..1 position of [value] inside [bounds]; a degenerate range maps to 0. */
fun priceFraction(value: Float, bounds: ClosedFloatingPointRange<Float>): Float {
    val span = bounds.endInclusive - bounds.start
    if (span <= 0f) return 0f
    return ((value - bounds.start) / span).coerceIn(0f, 1f)
}

/** The whole-JOD value under a horizontal fraction (already mirrored for RTL by the caller). */
fun priceAtFraction(fraction: Float, bounds: ClosedFloatingPointRange<Float>): Float {
    val clamped = fraction.coerceIn(0f, 1f)
    return (bounds.start + clamped * (bounds.endInclusive - bounds.start)).roundToInt().toFloat()
}

fun nearestThumb(value: Float, selection: ClosedFloatingPointRange<Float>): PriceThumb =
    if (abs(value - selection.start) <= abs(value - selection.endInclusive)) PriceThumb.Min else PriceThumb.Max

/** Moves one thumb to [value] without crossing the other (design: `min(v, p1)` / `max(v, p0)`). */
fun movedSelection(thumb: PriceThumb, value: Float, selection: ClosedFloatingPointRange<Float>): ClosedFloatingPointRange<Float> =
    when (thumb) {
        PriceThumb.Min -> minOf(value, selection.endInclusive)..selection.endInclusive
        PriceThumb.Max -> selection.start..maxOf(value, selection.start)
    }

/** Fraction of the track under an x position; mirrored when the layout is RTL. */
fun trackFraction(x: Float, width: Float, rtl: Boolean): Float {
    if (width <= 0f) return 0f
    val raw = (x / width).coerceIn(0f, 1f)
    return if (rtl) 1f - raw else raw
}
