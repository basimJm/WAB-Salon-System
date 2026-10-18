package com.fab.wab.customer.core.analytics.di

import com.fab.wab.customer.core.analytics.AnalyticsBackend
import com.fab.wab.customer.core.analytics.AnalyticsContextProvider
import com.fab.wab.customer.core.analytics.AnalyticsIssueReporter
import com.fab.wab.customer.core.analytics.AnalyticsTracker
import com.fab.wab.customer.core.analytics.DefaultAnalyticsTracker
import com.fab.wab.customer.core.analytics.NoOpAnalyticsBackend
import com.fab.wab.customer.core.analytics.NoOpAnalyticsIssueReporter
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.SupervisorJob
import org.koin.core.module.Module
import org.koin.dsl.module

/**
 * Binds the tracker. The app must bind an [AnalyticsContextProvider]; the [AnalyticsBackend] comes from Koin
 * (the Firebase module binds it) or from [backend], and falls back to no-op so tests and previews run without Firebase.
 */
fun analyticsModule(
    backend: AnalyticsBackend? = null,
    issueReporter: AnalyticsIssueReporter = NoOpAnalyticsIssueReporter,
): Module = module {
    if (backend != null) single<AnalyticsBackend> { backend }
    single<AnalyticsIssueReporter> { issueReporter }
    single<AnalyticsTracker> {
        DefaultAnalyticsTracker(
            backend = getOrNull<AnalyticsBackend>() ?: NoOpAnalyticsBackend,
            contextProvider = get<AnalyticsContextProvider>(),
            scope = CoroutineScope(SupervisorJob() + Dispatchers.Default),
            issueReporter = get(),
        )
    }
}
