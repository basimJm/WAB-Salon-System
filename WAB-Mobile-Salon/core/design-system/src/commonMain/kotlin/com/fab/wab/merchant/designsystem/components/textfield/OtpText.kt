package com.fab.wab.merchant.designsystem.components.textfield

/**
 * The digits of a one-time code as the user typed or pasted them, at most [length] ASCII digits. Pure and tested.
 *
 * - Arabic-Indic (`٠…٩`, the iOS Arabic number pad) and Eastern Arabic-Indic (`۰…۹`) digits become `0…9`.
 * - A paste of a whole code (the WhatsApp "copy code" button, or a message containing it) replaces what was typed
 *   before ([previous]) instead of being appended after it and cut.
 * - [restart] (the code was refused): the next typed digit starts a new code instead of being dropped after a full
 *   wrong one; deleting still edits the refused code.
 */
fun sanitizeOtp(input: String, length: Int, previous: String = "", restart: Boolean = false): String {
    if (length <= 0) return ""
    val digits = otpDigits(input)
    val inserted = when {
        previous.isEmpty() -> digits
        digits.startsWith(previous) -> digits.substring(previous.length)
        digits.endsWith(previous) -> digits.substring(0, digits.length - previous.length)
        else -> digits
    }
    val typedMore = digits.length > previous.length && inserted.isNotEmpty()
    return when {
        inserted.length >= length -> inserted.take(length)
        restart && typedMore -> inserted
        else -> digits.take(length)
    }
}

/** Every digit of [input] as ASCII `0…9`, in order; anything else is dropped. */
fun otpDigits(input: String): String = buildString {
    input.forEach { char -> asciiDigit(char)?.let(::append) }
}

private fun asciiDigit(char: Char): Char? = when (char) {
    in ASCII_ZERO..ASCII_NINE -> char
    in ARABIC_INDIC_ZERO..ARABIC_INDIC_NINE -> ASCII_ZERO + (char - ARABIC_INDIC_ZERO)
    in EASTERN_ARABIC_INDIC_ZERO..EASTERN_ARABIC_INDIC_NINE -> ASCII_ZERO + (char - EASTERN_ARABIC_INDIC_ZERO)
    else -> null
}

private const val ASCII_ZERO = '0'
private const val ASCII_NINE = '9'
private const val ARABIC_INDIC_ZERO = '٠'
private const val ARABIC_INDIC_NINE = '٩'
private const val EASTERN_ARABIC_INDIC_ZERO = '۰'
private const val EASTERN_ARABIC_INDIC_NINE = '۹'
