package com.fab.wab.customer.app.analytics

import com.fab.wab.customer.core.analytics.AnalyticsUserType
import com.fab.wab.customer.core.common.AppEnvironment
import com.fab.wab.customer.core.domain.AppLanguage
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.test.runTest
import kotlin.test.Test
import kotlin.test.assertEquals
import kotlin.test.assertNull

class AppAnalyticsContextProviderTest {

    private val environment = AppEnvironment(
        name = "dev",
        apiBaseUrl = "https://example.invalid",
        appVersion = "1.2.3",
        appVersionCode = 7,
        isDebug = true,
    )

    @Test
    fun contextReflectsEnvironmentLanguageAndPlatform() = runTest {
        val language = MutableStateFlow(AppLanguage.ARABIC)
        val context = AppAnalyticsContextProvider(environment, language, platform = "android").current()
        assertEquals("ar", context.language)
        assertEquals("1.2.3", context.appVersion)
        assertEquals("dev", context.environment)
        assertEquals("android", context.platform)
        assertEquals(AnalyticsUserType.GUEST, context.userType)
        assertNull(context.genderScope)
    }

    @Test
    fun languageChangesAreReadOnEveryCall() = runTest {
        val language = MutableStateFlow(AppLanguage.ARABIC)
        val provider = AppAnalyticsContextProvider(environment, language, platform = "ios")
        assertEquals("ar", provider.current().language)
        language.value = AppLanguage.ENGLISH
        assertEquals("en", provider.current().language)
    }
}
