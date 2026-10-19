package com.fab.wab.customer.core.common

/** Shareable links of the platform website (PRD S07 share; the domain is `AppEnvironment.webBaseUrl`). */
object DeepLinks {
    private const val SALONS_PATH = "salons"
    private const val SEPARATOR = '/'

    fun salon(webBaseUrl: String, salonId: String): String =
        "${webBaseUrl.trimEnd(SEPARATOR)}$SEPARATOR$SALONS_PATH$SEPARATOR${salonId.trim()}"
}
