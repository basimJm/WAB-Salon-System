package com.fab.wab.customer.app.auth

import com.fab.wab.customer.core.common.AppEnvironment
import com.fab.wab.customer.core.domain.config.ClientPlatform
import com.fab.wab.customer.core.firebase.FakeAppInstanceIdProvider
import com.fab.wab.customer.core.firebase.FakePushTokenProvider
import kotlinx.coroutines.test.runTest
import kotlin.test.Test
import kotlin.test.assertEquals
import kotlin.test.assertNull

class AppInstallationInfoProviderTest {

    private val environment = AppEnvironment("dev", "https://api.example", "1.2.3", 7, isDebug = true)
    private val instanceId = FakeAppInstanceIdProvider()

    private fun provider(osVersion: String = "14", model: String = "Pixel") = AppInstallationInfoProvider(
        environment, ClientPlatform.ANDROID, instanceId, FakePushTokenProvider("fcm-1"), osVersion, model,
    )

    @Test
    fun buildsTheInstallationFromTheHostFacts() = runTest {
        val info = provider().current()
        assertEquals(FakeAppInstanceIdProvider.DEFAULT_APP_INSTANCE_ID, info?.installationId)
        assertEquals("ANDROID", info?.platform)
        assertEquals("1.2.3", info?.appVersion)
        assertEquals("14", info?.osVersion)
        assertEquals("Pixel", info?.deviceModel)
        assertEquals("fcm-1", info?.fcmToken)
        assertNull(provider(osVersion = "", model = "").current()?.osVersion)
    }

    @Test
    fun noAppInstanceIdMeansNoInstallation() = runTest {
        instanceId.id = null
        assertNull(provider().current())
    }
}
