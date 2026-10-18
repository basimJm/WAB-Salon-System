package com.fab.wab.customer.app.di

import com.fab.wab.customer.app.analytics.AppAnalyticsContextProvider
import com.fab.wab.customer.core.analytics.AnalyticsContextProvider
import com.fab.wab.customer.core.domain.AppearanceSettings
import com.fab.wab.customer.core.domain.session.SessionStore
import com.fab.wab.customer.getPlatform
import org.koin.dsl.module

/** App-side analytics bindings: the context provider the core tracker needs (user type and scope from the session store). */
val analyticsAppModule = module {
    single<AnalyticsContextProvider> {
        AppAnalyticsContextProvider(
            environment = get(),
            language = get<AppearanceSettings>().language,
            session = get<SessionStore>().state,
            platform = getPlatform().analyticsName,
        )
    }
}
