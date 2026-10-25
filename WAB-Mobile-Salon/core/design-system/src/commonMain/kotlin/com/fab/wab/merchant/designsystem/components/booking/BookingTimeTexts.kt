package com.fab.wab.merchant.designsystem.components.booking

import androidx.compose.runtime.Composable
import com.fab.wab.merchant.designsystem.resources.Res
import com.fab.wab.merchant.designsystem.resources.booking_age_days
import com.fab.wab.merchant.designsystem.resources.booking_age_hours
import com.fab.wab.merchant.designsystem.resources.booking_age_minutes
import com.fab.wab.merchant.designsystem.resources.booking_age_now
import com.fab.wab.merchant.designsystem.resources.booking_auto_cancel_due
import com.fab.wab.merchant.designsystem.resources.booking_auto_cancel_in
import com.fab.wab.merchant.designsystem.resources.duration_hours_minutes
import com.fab.wab.merchant.designsystem.resources.duration_minutes
import org.jetbrains.compose.resources.pluralStringResource
import org.jetbrains.compose.resources.stringResource
import kotlin.time.Duration
import kotlin.time.Duration.Companion.minutes

/** How a request age reads: "now" under a minute, then whole minutes, hours, days (rounded down). */
enum class AgeUnit { NOW, MINUTES, HOURS, DAYS }

data class AgeLabel(val unit: AgeUnit, val value: Int)

fun ageLabelOf(age: Duration): AgeLabel {
    val minutes = age.inWholeMinutes
    val hours = age.inWholeHours
    return when {
        minutes < 1 -> AgeLabel(AgeUnit.NOW, 0)
        hours < 1 -> AgeLabel(AgeUnit.MINUTES, minutes.toInt())
        age.inWholeDays < 1 -> AgeLabel(AgeUnit.HOURS, hours.toInt())
        else -> AgeLabel(AgeUnit.DAYS, age.inWholeDays.toInt())
    }
}

/** Countdown split into hours and minutes; minutes round UP so "30 s left" still reads "1 m", never "0 m". */
data class Countdown(val hours: Int, val minutes: Int) {
    val isDue: Boolean get() = hours == 0 && minutes == 0
}

fun countdownOf(remaining: Duration): Countdown {
    if (remaining <= Duration.ZERO) return Countdown(0, 0)
    val whole = remaining.inWholeMinutes
    val totalMinutes = (if (remaining > whole.minutes) whole + 1 else whole).toInt()
    return Countdown(totalMinutes / MINUTES_PER_HOUR, totalMinutes % MINUTES_PER_HOUR)
}

private const val MINUTES_PER_HOUR = 60

@Composable
fun pendingAgeText(age: Duration): String {
    val label = ageLabelOf(age)
    return when (label.unit) {
        AgeUnit.NOW -> stringResource(Res.string.booking_age_now)
        AgeUnit.MINUTES -> pluralStringResource(Res.plurals.booking_age_minutes, label.value, label.value)
        AgeUnit.HOURS -> pluralStringResource(Res.plurals.booking_age_hours, label.value, label.value)
        AgeUnit.DAYS -> pluralStringResource(Res.plurals.booking_age_days, label.value, label.value)
    }
}

@Composable
fun durationText(countdown: Countdown): String = if (countdown.hours > 0) {
    stringResource(Res.string.duration_hours_minutes, countdown.hours, countdown.minutes)
} else {
    stringResource(Res.string.duration_minutes, countdown.minutes)
}

/** "Auto-cancels in 6h 50m if not answered", or "Auto-cancelling now" once due. */
@Composable
fun autoCancelText(remaining: Duration): String {
    val countdown = countdownOf(remaining)
    return if (countdown.isDue) {
        stringResource(Res.string.booking_auto_cancel_due)
    } else {
        stringResource(Res.string.booking_auto_cancel_in, durationText(countdown))
    }
}
