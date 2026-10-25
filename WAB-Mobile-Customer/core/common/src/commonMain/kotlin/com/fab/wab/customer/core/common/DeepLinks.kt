package com.fab.wab.customer.core.common

/** A link the app can open (PRD §4.4). */
sealed interface DeepLink {
    /** [branchId] preselects a branch (BUSINESS_DOMAIN §5.17: `/salon/{salonId}?branchId={branchId}`). */
    data class Salon(val salonId: String, val branchId: String? = null) : DeepLink
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
    private const val PARAM_SEPARATOR = '&'
    private const val VALUE_SEPARATOR = '='
    /** Query parameter of a salon link that preselects a branch. */
    const val BRANCH_PARAM = "branchId"

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
        val withoutFragment = url.trim().substringBefore(FRAGMENT)
        val trimmed = withoutFragment.substringBefore(QUERY)
        val branchId = queryValue(withoutFragment.substringAfter(QUERY, missingDelimiterValue = ""), BRANCH_PARAM)
        val afterScheme = trimmed.substringAfter(SCHEME_SEPARATOR, missingDelimiterValue = "")
        if (afterScheme.isEmpty()) return null
        val host = afterScheme.substringBefore(SEPARATOR)
        if (webBaseUrl != null && !host.equals(host(webBaseUrl), ignoreCase = true)) return null
        val segments = afterScheme.substringAfter(SEPARATOR, missingDelimiterValue = "").split(SEPARATOR).filter { it.isNotBlank() }
        return when {
            segments.size == SALON_SEGMENTS && segments.first() == SALON_PATH -> DeepLink.Salon(segments.last(), branchId)
            else -> null
        }
    }

    /** The first non-blank value of [name] in a raw query string (ids are URL-safe, so no decoding is needed). */
    private fun queryValue(query: String, name: String): String? = query.split(PARAM_SEPARATOR)
        .map { it.substringBefore(VALUE_SEPARATOR) to it.substringAfter(VALUE_SEPARATOR, missingDelimiterValue = "") }
        .firstOrNull { (key, value) -> key == name && value.isNotBlank() }
        ?.second
        ?.trim()

    private const val SALON_SEGMENTS = 2
}
