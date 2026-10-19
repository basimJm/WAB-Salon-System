package com.fab.wab.customer.core.common

/** 12-hour display of the server's "HH:mm" times (root CLAUDE.md: display 12-hour); labels come from resources. */
object TimeFormat {
    private const val HOURS_IN_HALF_DAY = 12
    private const val HOURS_IN_DAY = 24
    private const val MINUTES_IN_HOUR = 60
    private const val MINUTE_DIGITS = 2
    private const val TIME_PARTS = 2
    private const val SEPARATOR = ':'
    private const val PAD = '0'
    private const val INVALID = -1

    /** "16:05" → "4:05 PM"; null when the input is not a valid "HH:mm" (fixtures, bad data) so callers can hide it. */
    fun to12Hour(hhmm: String, am: String, pm: String): String? {
        val parts = hhmm.trim().split(SEPARATOR)
        val hour = parts.getOrNull(0)?.toIntOrNull() ?: INVALID
        val minute = parts.getOrNull(1)?.toIntOrNull() ?: INVALID
        val valid = parts.size == TIME_PARTS && hour in 0 until HOURS_IN_DAY && minute in 0 until MINUTES_IN_HOUR
        if (!valid) return null
        val label = if (hour < HOURS_IN_HALF_DAY) am else pm
        val shown = (hour % HOURS_IN_HALF_DAY).let { if (it == 0) HOURS_IN_HALF_DAY else it }
        return "$shown$SEPARATOR${minute.toString().padStart(MINUTE_DIGITS, PAD)} $label"
    }

    /** "8:00 AM – 4:00 PM"; null when either end is invalid. */
    fun range12Hour(open: String, close: String, am: String, pm: String, rangeSeparator: String): String? {
        val from = to12Hour(open, am, pm) ?: return null
        val to = to12Hour(close, am, pm) ?: return null
        return "$from$rangeSeparator$to"
    }
}
