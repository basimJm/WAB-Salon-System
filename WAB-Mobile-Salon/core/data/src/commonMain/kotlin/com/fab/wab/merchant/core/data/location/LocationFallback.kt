package com.fab.wab.merchant.core.data.location

import kotlinx.coroutines.withTimeoutOrNull

/**
 * How long a fresh fix may take before the last known position answers. Shorter than the map picker's overall
 * `LOCATE_TIMEOUT_MS` (15 s), so the fallback still runs inside it: before MER-079 the picker's timeout cancelled the
 * whole lookup while the fresh request was pending, and the last known position was never read.
 */
const val FRESH_FIX_TIMEOUT_MS = 8_000L

/** A fresh fix within [freshTimeoutMs], else the last known one; null when neither exists. */
suspend fun <T : Any> freshOrLastKnown(
    fresh: suspend () -> T?,
    lastKnown: suspend () -> T?,
    freshTimeoutMs: Long = FRESH_FIX_TIMEOUT_MS,
): T? = withTimeoutOrNull(freshTimeoutMs) { fresh() } ?: lastKnown()
