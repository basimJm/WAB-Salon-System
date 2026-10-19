package com.fab.wab.customer.app.analytics

import com.fab.wab.customer.core.analytics.AnalyticsUserType
import com.fab.wab.customer.core.common.AppEnvironment
import com.fab.wab.customer.core.domain.AppLanguage
import com.fab.wab.customer.core.domain.session.Gender
import com.fab.wab.customer.core.domain.session.GuestProfile
import com.fab.wab.customer.core.domain.session.SessionState
import com.fab.wab.customer.core.domain.session.UserProfile
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.test.runTest
import kotlin.test.Test
import kotlin.test.assertEquals
import kotlin.test.assertNull

class AppAnalyticsContextProviderTest {

    private val environment = AppEnvironment(
        name = "dev",
        apiBaseUrl = "https://example.invalid",
        webBaseUrl = "https://example.invalid",
        appVersion = "1.2.3",
        appVersionCode = 7,
        isDebug = true,
    )
    private val language = MutableStateFlow(AppLanguage.ARABIC)
    private val session = MutableStateFlow<SessionState>(SessionState.Guest())

    private fun provider(platform: String = "android") = AppAnalyticsContextProvider(environment, language, session, platform)

    @Test
    fun contextReflectsEnvironmentLanguageAndPlatform() = runTest {
        val context = provider().current()
        assertEquals("ar", context.language)
        assertEquals("1.2.3", context.appVersion)
        assertEquals("dev", context.environment)
        assertEquals("android", context.platform)
        assertEquals(AnalyticsUserType.GUEST, context.userType)
        assertNull(context.genderScope)
    }

    @Test
    fun languageChangesAreReadOnEveryCall() = runTest {
        val provider = provider(platform = "ios")
        assertEquals("ar", provider.current().language)
        language.value = AppLanguage.ENGLISH
        assertEquals("en", provider.current().language)
    }

    @Test
    fun sessionStateGivesUserTypeAndScopeOnly() = runTest {
        session.value = SessionState.Guest(GuestProfile(nickname = "Lina", gender = Gender.FEMALE))
        val guest = provider().current()
        assertEquals(AnalyticsUserType.GUEST, guest.userType)
        assertEquals("female", guest.genderScope)
        session.value = SessionState.SignedIn(UserProfile(id = "c1", firstName = "Omar", gender = Gender.MALE))
        val registered = provider().current()
        assertEquals(AnalyticsUserType.REGISTERED, registered.userType)
        assertEquals("male", registered.genderScope)
    }
}
