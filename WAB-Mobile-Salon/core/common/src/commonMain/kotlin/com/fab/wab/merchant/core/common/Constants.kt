package com.fab.wab.merchant.core.common
/** Koin qualifiers of the coroutine dispatchers and the log-only fallback error text. */
object Constants {
    const val IO = "DispatcherIO"
    const val DEFAULT = "DispatcherDefault"
    const val MAIN = "DispatcherMain"
    const val DEFAULT_ERROR_MESSAGE = "Something went wrong"
}
