package com.fab.wab.merchant.core.ui.utils

import androidx.compose.runtime.Composable
import androidx.compose.runtime.ProvidedValue
import androidx.compose.runtime.staticCompositionLocalOf
import platform.Foundation.NSUserDefaults

actual object LocalAppLocale {

    private val defaultLocale = getDefaultLocale()

    private val LocalLocale = staticCompositionLocalOf { defaultLocale }
    actual val current: String
        @Composable
        get() = LocalLocale.current

    @Composable
    actual infix fun provides(value: String?): ProvidedValue<*> {
        val newLocale = value ?: defaultLocale
        if (value == null) {
            NSUserDefaults.standardUserDefaults.removeObjectForKey("AppleLanguages")
        } else {
            NSUserDefaults.standardUserDefaults.setObject(
                listOf(newLocale),
                "AppleLanguages"
            )
        }

        return LocalLocale provides newLocale
    }
}
