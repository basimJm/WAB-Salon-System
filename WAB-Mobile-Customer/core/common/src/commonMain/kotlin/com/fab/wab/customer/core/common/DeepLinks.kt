package com.fab.wab.customer.core.common

/** A link the app can open (PRD §4.4). */
sealed interface DeepLink {
    data class Salon(val salonId: String) : DeepLink
}

/** Shareable links of the platform website (PRD §4.4 `https://<domain>/salon/{salonId}`; the domain is `AppEnvironment.webBaseUrl`). */
object DeepLinks {
    /** PRD §4.4 path segment of a salon link. */
    const val SALON_PATH = "salon"
    /** S21 "Register your salon with us": the merchant onboarding page of the platform website (until the Merchant PRD defines it). */
    private const val MERCHANT_REGISTRATION_PATH = "merchants/register"
    private const val SEPARATOR = '/'
    private const val SCHEME_SEPARATOR = "://"
    private const val QUERY = '?'
    private const val FRAGMENT = '#'

    fun salon(webBaseUrl: String, salonId: String): String =
        "${webBaseUrl.trimEnd(SEPARATOR)}$SEPARATOR$SALON_PATH$SEPARATOR${salonId.trim()}"

    fun merchantRegistration(webBaseUrl: String): String = "${webBaseUrl.trimEnd(SEPARATOR)}$SEPARATOR$MERCHANT_REGISTRATION_PATH"

    /** Website host of [webBaseUrl] (`dev.example.app`): the App Links / Universal Links domain. */
    fun host(webBaseUrl: String): String = webBaseUrl.substringAfter(SCHEME_SEPARATOR).substringBefore(SEPARATOR).trim()

    /**
     * Parses an opened URL; null for anything the app does not handle. The host is compared case-insensitively;
     * a null [webBaseUrl] accepts any host (the OS already verified the association).
     */
    fun parse(url: String, webBaseUrl: String? = null): DeepLink? {
        val trimmed = url.trim().substringBefore(QUERY).substringBefore(FRAGMENT)
        val afterScheme = trimmed.substringAfter(SCHEME_SEPARATOR, missingDelimiterValue = "")
        if (afterScheme.isEmpty()) return null
        val host = afterScheme.substringBefore(SEPARATOR)
        if (webBaseUrl != null && !host.equals(host(webBaseUrl), ignoreCase = true)) return null
        val segments = afterScheme.substringAfter(SEPARATOR, missingDelimiterValue = "").split(SEPARATOR).filter { it.isNotBlank() }
        return when {
            segments.size == SALON_SEGMENTS && segments.first() == SALON_PATH -> DeepLink.Salon(segments.last())
            else -> null
        }
    }

    private const val SALON_SEGMENTS = 2
}
