package com.fab.wab.customer.app.analytics

import com.fab.wab.customer.core.analytics.AnalyticsContext
import com.fab.wab.customer.core.analytics.AnalyticsContextProvider
import com.fab.wab.customer.core.analytics.AnalyticsUserType
import com.fab.wab.customer.core.common.AppEnvironment
import com.fab.wab.customer.core.domain.AppLanguage
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.first

/**
 * Builds the common analytics fields (PRD §14) from the app's own sources: environment + version from
 * [AppEnvironment], the current language from the appearance settings flow, platform from the host.
 * User type and gender scope come from the session store once CUS-011 lands; until then every event is a
 * guest event without a scope.
 */
class AppAnalyticsContextProvider(
    private val environment: AppEnvironment,
    private val language: Flow<AppLanguage>,
    private val platform: String,
) : AnalyticsContextProvider {

    override suspend fun current(): AnalyticsContext = AnalyticsContext(
        userType = AnalyticsUserType.GUEST,
        genderScope = null,
        language = language.first().code,
        appVersion = environment.appVersion,
        platform = platform,
        environment = environment.name,
    )
}
