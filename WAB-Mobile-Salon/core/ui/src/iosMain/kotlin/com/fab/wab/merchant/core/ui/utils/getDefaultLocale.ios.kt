package com.fab.wab.merchant.core.ui.utils

import platform.Foundation.NSLocale
import platform.Foundation.preferredLanguages

/** Used when iOS reports no preferred language. */
private const val FALLBACK_LOCALE = "en"

actual fun getDefaultLocale(): String {
    return (NSLocale.preferredLanguages.firstOrNull() as? String) ?: FALLBACK_LOCALE
}
