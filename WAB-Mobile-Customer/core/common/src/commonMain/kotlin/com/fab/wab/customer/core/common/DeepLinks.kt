package com.fab.wab.customer.core.common

/** Shareable links of the platform website (PRD S07 share; the domain is `AppEnvironment.webBaseUrl`). */
object DeepLinks {
    private const val SALONS_PATH = "salons"
    /** S21 "Register your salon with us": the merchant onboarding page of the platform website (until the Merchant PRD defines it). */
    private const val MERCHANT_REGISTRATION_PATH = "merchants/register"
    private const val SEPARATOR = '/'

    fun salon(webBaseUrl: String, salonId: String): String =
        "${webBaseUrl.trimEnd(SEPARATOR)}$SEPARATOR$SALONS_PATH$SEPARATOR${salonId.trim()}"

    fun merchantRegistration(webBaseUrl: String): String = "${webBaseUrl.trimEnd(SEPARATOR)}$SEPARATOR$MERCHANT_REGISTRATION_PATH"
}
