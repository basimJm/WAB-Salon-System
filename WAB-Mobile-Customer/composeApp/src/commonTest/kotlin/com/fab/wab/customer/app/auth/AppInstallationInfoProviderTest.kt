package com.fab.wab.customer.app.auth

import com.fab.wab.customer.core.common.AppEnvironment
import com.fab.wab.customer.core.domain.config.ClientPlatform
import com.fab.wab.customer.core.firebase.FakeAppInstanceIdProvider
import com.fab.wab.customer.core.firebase.FakePushTokenProvider
import kotlinx.coroutines.test.runTest
import kotlin.test.Test
import kotlin.test.assertEquals
import kotlin.test.assertNull
import kotlin.test.assertTrue

class AppInstallationInfoProviderTest {

    private val environment = AppEnvironment("dev", "https://api.example", "https://web.example", "1.2.3", 7, isDebug = true)
    private val instanceId = FakeAppInstanceIdProvider()

    private fun provider(osVersion: String = "14", model: String = "Pixel") = AppInstallationInfoProvider(
        environment, ClientPlatform.ANDROID, instanceId, FakePushTokenProvider("fcm-1"), osVersion, model,
        localInstallationId = { LOCAL_ID },
    )

    @Test
    fun buildsTheInstallationFromTheHostFacts() = runTest {
        val info = provider().current()
        assertEquals(FakeAppInstanceIdProvider.DEFAULT_APP_INSTANCE_ID, info.installationId)
        assertEquals("ANDROID", info.platform)
        assertEquals("1.2.3", info.appVersion)
        assertEquals("14", info.osVersion)
        assertEquals("Pixel", info.deviceModel)
        assertEquals("fcm-1", info.fcmToken)
        assertNull(provider(osVersion = "", model = "").current().osVersion)
    }

    @Test
    fun withoutAnAppInstanceIdTheLocalIdKeepsTheInstallationValid() = runTest {
        // CUS-092: the old "unknown" marker failed the login contract (id 8+ chars, platform enum) on the iOS simulator.
        instanceId.id = null
        val info = provider().current()
        assertEquals(LOCAL_ID, info.installationId)
        assertEquals("ANDROID", info.platform)
        assertTrue(CONTRACT_ID.matches(info.installationId))
    }

    @Test
    fun localIdIsCreatedOnceThenReused() = runTest {
        var stored: String? = null
        var created = 0
        val localId = LocalInstallationId(read = { stored }, write = { stored = it }, newId = { created += 1; "id-$created-0000" })
        val first = localId()
        assertEquals(first, localId())
        assertEquals(1, created)
        assertEquals(first, stored)
    }

    private companion object {
        const val LOCAL_ID = "1b4e28ba-2fa1-11d2-883f-0016d3cca427"
        val CONTRACT_ID = Regex("^[A-Za-z0-9._-]{8,128}$")
    }
}
