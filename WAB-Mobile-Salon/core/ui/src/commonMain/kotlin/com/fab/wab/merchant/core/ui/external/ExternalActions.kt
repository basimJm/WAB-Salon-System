package com.fab.wab.merchant.core.ui.external

import org.koin.core.module.Module
import org.koin.dsl.module

/**
 * Hand-offs to other apps: maps, dialer, WhatsApp chat, mail, browser, native share sheet. Never throws; the suspend
 * calls answer whether another app took over, so the screen can explain when nothing could open (no dialer on a
 * tablet or simulator, WhatsApp missing and no browser, …).
 */
interface ExternalActions {
    suspend fun openMaps(latitude: Double, longitude: Double, label: String): Boolean
    suspend fun dial(phoneE164: String): Boolean

    /** WhatsApp chat with [phoneE164], [text] already typed when given; the `wa.me` web page when WhatsApp is missing. */
    suspend fun openWhatsApp(phoneE164: String, text: String? = null): Boolean
    fun share(text: String)

    /** Web page in the system browser (store page, partner registration) or a `mailto:` / `tel:` link. */
    suspend fun openUrl(url: String): Boolean

    /** Mail app composer. */
    suspend fun email(address: String): Boolean

    /** Opens [appUrl] in the app identified by [appId] (package / URL scheme) when installed, else [fallbackUrl] (store page). */
    suspend fun openApp(appUrl: String, appId: String, fallbackUrl: String): Boolean

    /** Copies [text] to the system clipboard (booking reference, a phone number that could not be dialled). */
    fun copyText(text: String)
}

/** Pure link builders shared by the platforms (unit-tested). */
object ExternalLinks {
    private const val SCHEME_SEPARATOR = "://"
    private const val HTTPS = "https"
    private const val WHATSAPP_HOST = "wa.me"
    private const val WHATSAPP_APP_SCHEME = "whatsapp"
    private const val WHATSAPP_APP_SEND = "send"
    private const val PHONE_PARAM = "phone="
    private const val TEL_SCHEME = "tel"
    private const val MAILTO_SCHEME = "mailto"
    private const val PATH_SEPARATOR = '/'
    private const val PLUS = '+'

    /**
     * The number as a dialler expects it: ASCII digits with a leading `+` kept, everything else (spaces, dashes,
     * bidi isolates around a displayed phone, Arabic-Indic digits) normalized away.
     */
    fun dialable(phone: String): String {
        val trimmed = phone.trim { it.isWhitespace() || it.isBidiMark() }
        val digits = buildString {
            trimmed.forEach { char -> asciiDigit(char)?.let(::append) }
        }
        return if (trimmed.firstOrNull() == PLUS) "$PLUS$digits" else digits
    }

    /** `https://wa.me/<digits>`: WhatsApp wants the number without `+` or spaces. */
    fun whatsApp(phoneE164: String): String =
        "$HTTPS$SCHEME_SEPARATOR$WHATSAPP_HOST$PATH_SEPARATOR${dialable(phoneE164).trimStart(PLUS)}"

    /** WhatsApp chat with [text] already typed (`https://wa.me/<digits>?text=…`), e.g. a reported review reference. */
    fun whatsAppMessage(phoneE164: String, text: String?): String =
        whatsApp(phoneE164) + (text?.takeIf { it.isNotBlank() }?.let { QUERY_START + TEXT_PARAM + queryEncode(it) } ?: "")

    /** The app's own scheme (`whatsapp://send?phone=…&text=…`), used on iOS when the app is installed. */
    fun whatsAppApp(phoneE164: String, text: String?): String = buildString {
        append(WHATSAPP_APP_SCHEME).append(SCHEME_SEPARATOR).append(WHATSAPP_APP_SEND)
        append(QUERY_START).append(PHONE_PARAM).append(dialable(phoneE164).trimStart(PLUS))
        text?.takeIf { it.isNotBlank() }?.let { append(PARAM_SEPARATOR).append(TEXT_PARAM).append(queryEncode(it)) }
    }

    fun tel(phoneE164: String): String = "$TEL_SCHEME:${dialable(phoneE164)}"

    fun mailto(address: String): String = "$MAILTO_SCHEME:${address.trim()}"

    /** Mail composer with [subject] and [body] filled in. */
    fun mailtoMessage(address: String, subject: String, body: String): String =
        mailto(address) + QUERY_START + SUBJECT_PARAM + queryEncode(subject) + PARAM_SEPARATOR + BODY_PARAM + queryEncode(body)

    private const val QUERY_START = '?'
    private const val PARAM_SEPARATOR = '&'
    private const val TEXT_PARAM = "text="
    private const val SUBJECT_PARAM = "subject="
    private const val BODY_PARAM = "body="

    /** RFC 3986 query encoding of a label (UTF-8 bytes as %XX; unreserved characters kept). */
    fun queryEncode(value: String): String = buildString {
        value.encodeToByteArray().forEach { byte ->
            val code = byte.toInt() and BYTE_MASK
            val char = code.toChar()
            if (char.isUnreserved()) append(char) else append(PERCENT).append(HEX[code shr NIBBLE]).append(HEX[code and NIBBLE_MASK])
        }
    }

    private fun Char.isUnreserved(): Boolean = this in 'A'..'Z' || this in 'a'..'z' || this in '0'..'9' || this in UNRESERVED

    private const val UNRESERVED = "-_.~"
    private const val PERCENT = '%'
    private const val HEX = "0123456789ABCDEF"
    private const val BYTE_MASK = 0xFF
    private const val NIBBLE = 4
    private const val NIBBLE_MASK = 0x0F
}

private fun asciiDigit(char: Char): Char? = when (char) {
    in '0'..'9' -> char
    in ARABIC_INDIC_ZERO until ARABIC_INDIC_ZERO + DIGIT_COUNT -> '0' + (char - ARABIC_INDIC_ZERO)
    in EXTENDED_ARABIC_INDIC_ZERO until EXTENDED_ARABIC_INDIC_ZERO + DIGIT_COUNT -> '0' + (char - EXTENDED_ARABIC_INDIC_ZERO)
    else -> null
}

private fun Char.isBidiMark(): Boolean = this in BIDI_MARKS

private const val ARABIC_INDIC_ZERO = '\u0660'
private const val EXTENDED_ARABIC_INDIC_ZERO = '\u06F0'
private const val DIGIT_COUNT = 10

/** LRM, RLM, ALM and the isolate / embedding controls the UI wraps phones in. */
private const val BIDI_MARKS = "\u200E\u200F\u061C\u2066\u2067\u2068\u2069\u202A\u202B\u202C\u202D\u202E"

/** Recording double for tests and previews; [available] = false simulates a device where nothing can open. */
class FakeExternalActions(var available: Boolean = true) : ExternalActions {
    val calls = mutableListOf<String>()
    override suspend fun openMaps(latitude: Double, longitude: Double, label: String) = record("maps:$latitude,$longitude:$label")
    override suspend fun dial(phoneE164: String) = record(ExternalLinks.tel(phoneE164))
    override suspend fun openWhatsApp(phoneE164: String, text: String?) = record(ExternalLinks.whatsAppMessage(phoneE164, text))
    override fun share(text: String) { calls += "share:$text" }
    override suspend fun openUrl(url: String) = record("url:$url")
    override suspend fun email(address: String) = record(ExternalLinks.mailto(address))
    override suspend fun openApp(appUrl: String, appId: String, fallbackUrl: String) = record("app:$appUrl|$appId|$fallbackUrl")
    override fun copyText(text: String) { calls += "copy:$text" }

    private fun record(call: String): Boolean {
        calls += call
        return available
    }
}

expect val platformExternalActionsModule: Module

val externalActionsModule: Module = module {
    includes(platformExternalActionsModule)
}
