package com.fab.wab.merchant.designsystem.components.format

import androidx.compose.runtime.Composable
import com.fab.wab.merchant.core.common.DateTimeText
import com.fab.wab.merchant.core.common.TimeFormat
import com.fab.wab.merchant.designsystem.resources.Res
import com.fab.wab.merchant.designsystem.resources.meta_pair
import com.fab.wab.merchant.designsystem.resources.price_jod
import com.fab.wab.merchant.designsystem.resources.time_am
import com.fab.wab.merchant.designsystem.resources.time_pm
import org.jetbrains.compose.resources.stringResource
import kotlin.time.Instant

private const val DECIMAL_POINT = '.'
private const val ZERO = '0'

/** Root CLAUDE.md: UTC stored, Asia/Amman shown, 12-hour clock in the app language (ص / م, AM / PM). */
@Composable
fun dateTimeText(instant: Instant): DateTimeText {
    val am = stringResource(Res.string.time_am)
    val pm = stringResource(Res.string.time_pm)
    return TimeFormat.instantText(instant.toString(), am, pm) ?: DateTimeText(date = instant.toString(), time = "")
}

/** "25 JOD" / "25 د.أ" from the contract's decimal text ("25.000" → "25", "12.500" → "12.5"). */
@Composable
fun jodText(amount: String): String = stringResource(Res.string.price_jod, trimAmount(amount))

/** Drops trailing zeros of a decimal text and a dangling point; anything else is returned trimmed. */
fun trimAmount(amount: String): String {
    val text = amount.trim()
    if (DECIMAL_POINT !in text) return text
    return text.trimEnd(ZERO).trimEnd(DECIMAL_POINT)
}

private const val LTR_ISOLATE = '⁦'
private const val POP_ISOLATE = '⁩'

/** Wraps a phone number, a reference or a time in LTR isolates so it never reorders inside Arabic text ("+962…"). */
fun ltrIsolate(value: String): String = "$LTR_ISOLATE$value$POP_ISOLATE"

private const val FIRST_STRONG_ISOLATE = '⁨'

/**
 * Wraps a part of a composed line in a first-strong isolate: it keeps its own direction ("11:30 ص – 12:15 م" stays
 * Arabic order inside "Dana Majali · …") and no longer decides the direction of the whole line (e2e: a Latin staff
 * name turned an Arabic line LTR and scrambled the times).
 */
fun bidiIsolate(value: String): String = "$FIRST_STRONG_ISOLATE$value$POP_ISOLATE"

/** "first · second" (`meta_pair`) with both parts isolated, so the line follows the app direction. */
@Composable
fun metaPair(first: String, second: String): String = stringResource(Res.string.meta_pair, bidiIsolate(first), bidiIsolate(second))

private const val FILS_PER_JOD = 1_000L
private const val FILS_DIGITS = 3

/** Integer fils (CLAUDE.md money rule) as a JOD decimal text ("12.500"). */
fun filsToDecimal(fils: Long): String =
    (fils / FILS_PER_JOD).toString() + DECIMAL_POINT.toString() + (fils % FILS_PER_JOD).toString().padStart(FILS_DIGITS, ZERO)

/** Localized JOD amount of integer fils ("10 JOD"). */
@Composable
fun jodTextOfFils(fils: Long): String = jodText(filsToDecimal(fils))

private const val ONE_DECIMAL_SCALE = 10L
private const val MINUS = '-'

/** One decimal for ratings and rates ("4.8", "5.0", "12.5"); negative values keep their sign. */
fun oneDecimalText(value: Double): String {
    val scaled = kotlin.math.round(value * ONE_DECIMAL_SCALE).toLong()
    val absolute = kotlin.math.abs(scaled)
    val text = (absolute / ONE_DECIMAL_SCALE).toString() + DECIMAL_POINT + (absolute % ONE_DECIMAL_SCALE).toString()
    return if (scaled < 0) MINUS + text else text
}

