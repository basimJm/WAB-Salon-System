package com.fab.wab.customer.app.analytics

import com.fab.wab.customer.core.analytics.AnalyticsContext
import com.fab.wab.customer.core.analytics.AnalyticsContextProvider
import com.fab.wab.customer.core.analytics.AnalyticsUserType
import com.fab.wab.customer.core.common.AppEnvironment
import com.fab.wab.customer.core.domain.AppLanguage
import com.fab.wab.customer.core.domain.session.SessionState
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.first

/**
 * Builds the common analytics fields (PRD §14) from the app's own sources: environment + version from
 * [AppEnvironment], the current language from the appearance settings flow, user type and gender scope from the
 * session state, platform from the host. Only the scope leaves the device, never the nickname or name (PRD §15).
 */
class AppAnalyticsContextProvider(
    private val environment: AppEnvironment,
    private val language: Flow<AppLanguage>,
    private val session: Flow<SessionState>,
    private val platform: String,
) : AnalyticsContextProvider {

    override suspend fun current(): AnalyticsContext {
        val state = session.first()
        return AnalyticsContext(
            userType = if (state.isSignedIn) AnalyticsUserType.REGISTERED else AnalyticsUserType.GUEST,
            genderScope = state.genderScope?.code?.lowercase(),
            language = language.first().code,
            appVersion = environment.appVersion,
            platform = platform,
            environment = environment.name,
        )
    }
}
