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
 * Binds the tracker. The app must bind an [AnalyticsContextProvider]; the [AnalyticsBackend] defaults to no-op
 * until the Firebase backend (CUS-004) replaces it, so dev builds without Firebase still run.
 */
fun analyticsModule(
    backend: AnalyticsBackend = NoOpAnalyticsBackend,
    issueReporter: AnalyticsIssueReporter = NoOpAnalyticsIssueReporter,
): Module = module {
    single<AnalyticsBackend> { backend }
    single<AnalyticsIssueReporter> { issueReporter }
    single<AnalyticsTracker> {
        DefaultAnalyticsTracker(
            backend = get(),
            contextProvider = get<AnalyticsContextProvider>(),
            scope = CoroutineScope(SupervisorJob() + Dispatchers.Default),
            issueReporter = get(),
        )
    }
}
