package com.fab.wab.merchant.app.di

import com.fab.wab.merchant.app.analytics.AppAnalyticsContextProvider
import com.fab.wab.merchant.app.analytics.SessionAnalyticsSync
import com.fab.wab.merchant.core.analytics.AnalyticsContextProvider
import com.fab.wab.merchant.core.domain.AppearanceSettings
import com.fab.wab.merchant.core.domain.session.SessionStore
import com.fab.wab.merchant.getPlatform
import org.koin.dsl.module

/** App-side analytics bindings: the context provider the core tracker needs (user type and scope from the session store). */
val analyticsAppModule = module {
    single { SessionAnalyticsSync(session = get<SessionStore>().state, tracker = get(), crashReporter = get()) }
    single<AnalyticsContextProvider> {
        AppAnalyticsContextProvider(
            environment = get(),
            language = get<AppearanceSettings>().language,
            session = get<SessionStore>().state,
            platform = getPlatform().analyticsName,
        )
    }
}
