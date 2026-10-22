package com.fab.wab.merchant.designsystem.components.format

import androidx.compose.runtime.Composable
import com.fab.wab.merchant.core.common.DateTimeText
import com.fab.wab.merchant.core.common.TimeFormat
import com.fab.wab.merchant.designsystem.resources.Res
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
