package com.fab.wab.customer.core.ui.external

import org.koin.core.module.Module
import org.koin.dsl.module

/** Hand-offs to other apps (PRD S07): maps chooser, dialer, WhatsApp chat, native share sheet. Never throws. */
interface ExternalActions {
    fun openMaps(latitude: Double, longitude: Double, label: String)
    fun dial(phoneE164: String)
    fun openWhatsApp(phoneE164: String)
    fun share(text: String)
}

/** Pure link builders shared by the platforms (unit-tested). */
object ExternalLinks {
    private const val SCHEME_SEPARATOR = "://"
    private const val WHATSAPP_SCHEME = "https"
    private const val WHATSAPP_HOST = "wa.me"
    private const val TEL_SCHEME = "tel"
    private const val PATH_SEPARATOR = '/'
    private val NON_DIGITS = Regex("[^0-9]")

    /** `https://wa.me/<digits>`: WhatsApp wants the number without `+` or spaces. */
    fun whatsApp(phoneE164: String): String =
        "$WHATSAPP_SCHEME$SCHEME_SEPARATOR$WHATSAPP_HOST$PATH_SEPARATOR${phoneE164.replace(NON_DIGITS, "")}"

    fun tel(phoneE164: String): String = "$TEL_SCHEME:${phoneE164.trim()}"

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

/** Recording double for tests and previews. */
class FakeExternalActions : ExternalActions {
    val calls = mutableListOf<String>()
    override fun openMaps(latitude: Double, longitude: Double, label: String) { calls += "maps:$latitude,$longitude:$label" }
    override fun dial(phoneE164: String) { calls += ExternalLinks.tel(phoneE164) }
    override fun openWhatsApp(phoneE164: String) { calls += ExternalLinks.whatsApp(phoneE164) }
    override fun share(text: String) { calls += "share:$text" }
}

expect val platformExternalActionsModule: Module

val externalActionsModule: Module = module {
    includes(platformExternalActionsModule)
}
