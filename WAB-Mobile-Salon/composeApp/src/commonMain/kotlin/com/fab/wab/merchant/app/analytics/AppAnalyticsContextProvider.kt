package com.fab.wab.merchant.app.analytics

import com.fab.wab.merchant.core.analytics.AnalyticsContext
import com.fab.wab.merchant.core.analytics.AnalyticsContextProvider
import com.fab.wab.merchant.core.analytics.AnalyticsUserType
import com.fab.wab.merchant.core.common.AppEnvironment
import com.fab.wab.merchant.core.domain.AppLanguage
import com.fab.wab.merchant.core.domain.session.SessionState
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.first

/**
 * Builds the common analytics fields from the app's own sources: environment + version from [AppEnvironment],
 * the current language from the appearance settings flow, user type from the session state, platform from the host.
 */
class AppAnalyticsContextProvider(
    private val environment: AppEnvironment,
    private val language: Flow<AppLanguage>,
    private val session: Flow<SessionState>,
    private val platform: String,
) : AnalyticsContextProvider {

    override suspend fun current(): AnalyticsContext = AnalyticsContext(
        userType = if (session.first().isSignedIn) AnalyticsUserType.REGISTERED else AnalyticsUserType.GUEST,
        language = language.first().code,
        appVersion = environment.appVersion,
        platform = platform,
        environment = environment.name,
    )
}
