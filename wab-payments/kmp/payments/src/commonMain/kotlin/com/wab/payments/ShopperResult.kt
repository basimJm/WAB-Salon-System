package com.wab.payments

/**
 * Reads the redirect a hosted payment page sends the shopper back to
 * (`<shopperResultUrl>?id=<checkoutId>&resourcePath=<path>`), without any platform URL class so it
 * works identically on Android and iOS.
 */
public object ShopperResult {
    private const val QUERY_START = '?'
    private const val FRAGMENT_START = '#'
    private const val PAIR_SEPARATOR = '&'
    private const val KEY_VALUE_SEPARATOR = '='
    public const val RESOURCE_PATH: String = "resourcePath"

    /** `true` when [url] is the return URL the session was created with (ignores query and fragment). */
    public fun isReturn(url: String, shopperResultUrl: String): Boolean =
        stripQuery(url).equals(stripQuery(shopperResultUrl), ignoreCase = true)

    /** The result for a return [url], or `null` when it is not the session's return URL. */
    public fun parse(session: CheckoutSession, url: String): PaymentResult? {
        if (!isReturn(url, session.shopperResultUrl)) return null
        val params = queryOf(url)
        val id = params["id"]
        if (id != null && id != session.checkoutId) {
            return PaymentResult.Failed(session.sessionId, PaymentError.invalidSession("Return URL is for another checkout"))
        }
        return PaymentResult.ClientCompleted(session.sessionId, params[RESOURCE_PATH])
    }

    internal fun queryOf(url: String): Map<String, String> {
        val withoutFragment = url.substringBefore(FRAGMENT_START)
        val query = withoutFragment.substringAfter(QUERY_START, missingDelimiterValue = "")
        if (query.isEmpty()) return emptyMap()
        return query.split(PAIR_SEPARATOR).filter { it.isNotEmpty() }.associate { pair ->
            val key = pair.substringBefore(KEY_VALUE_SEPARATOR)
            val value = pair.substringAfter(KEY_VALUE_SEPARATOR, missingDelimiterValue = "")
            percentDecode(key) to percentDecode(value)
        }
    }

    private fun stripQuery(url: String): String = url.substringBefore(QUERY_START).substringBefore(FRAGMENT_START).trimEnd('/')

    private fun percentDecode(text: String): String {
        if (!text.contains('%') && !text.contains('+')) return text
        val bytes = ArrayList<Byte>(text.length)
        var i = 0
        while (i < text.length) {
            val c = text[i]
            if (c == '%' && i + 2 < text.length && hexValue(text[i + 1]) >= 0 && hexValue(text[i + 2]) >= 0) {
                bytes += (hexValue(text[i + 1]) * HEX_BASE + hexValue(text[i + 2])).toByte()
                i += 3
            } else {
                val chunk = (if (c == '+') " " else c.toString()).encodeToByteArray()
                chunk.forEach { bytes += it }
                i += 1
            }
        }
        return bytes.toByteArray().decodeToString()
    }

    private fun hexValue(c: Char): Int = when (c) {
        in '0'..'9' -> c - '0'
        in 'a'..'f' -> c - 'a' + DECIMAL_OFFSET
        in 'A'..'F' -> c - 'A' + DECIMAL_OFFSET
        else -> -1
    }

    private const val HEX_BASE = 16
    private const val DECIMAL_OFFSET = 10
}
