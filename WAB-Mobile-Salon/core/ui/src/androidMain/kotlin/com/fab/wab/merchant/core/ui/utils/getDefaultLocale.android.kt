package com.fab.wab.merchant.core.ui.utils

import java.util.Locale

actual fun getDefaultLocale(): String {
    return Locale.getDefault().toString()
}
