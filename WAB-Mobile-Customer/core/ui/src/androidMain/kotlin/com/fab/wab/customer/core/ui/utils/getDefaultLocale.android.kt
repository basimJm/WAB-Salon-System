package com.fab.wab.customer.core.ui.utils

import java.util.Locale

actual fun getDefaultLocale(): String {
    return Locale.getDefault().toString()
}
