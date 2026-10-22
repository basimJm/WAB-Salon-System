package com.fab.wab.customer.app.deeplink

import com.fab.wab.customer.core.common.AppEnvironment
import com.fab.wab.customer.core.common.DeepLink
import com.fab.wab.customer.core.common.DeepLinks
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import org.koin.dsl.module

/**
 * Holds the last opened link until the shell can route it (PRD §4.4: onboarding / S02 first, then Home → Salon Details).
 * Platforms publish raw URLs; the shell consumes the parsed link once the NavHost is on screen.
 */
class DeepLinkStore(private val environment: AppEnvironment) {
    private val pending = MutableStateFlow<DeepLink?>(null)
    val link: StateFlow<DeepLink?> = pending

    /** Returns true when the URL is one the app handles. */
    fun publish(url: String?): Boolean {
        val parsed = url?.let { DeepLinks.parse(it, environment.webBaseUrl) } ?: return false
        pending.value = parsed
        return true
    }

    fun consume(link: DeepLink) {
        pending.compareAndSet(link, null)
    }
}

val deepLinkModule = module {
    single { DeepLinkStore(get()) }
}
