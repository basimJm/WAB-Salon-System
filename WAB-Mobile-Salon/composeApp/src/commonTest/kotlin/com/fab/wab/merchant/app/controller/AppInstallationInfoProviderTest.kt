package com.fab.wab.merchant.app.controller

import com.fab.wab.merchant.app.auth.AppInstallationInfoProvider
import com.fab.wab.merchant.app.auth.storedOrNewId
import com.fab.wab.merchant.core.common.AppEnvironment
import com.fab.wab.merchant.core.domain.config.ClientPlatform
import com.fab.wab.merchant.core.firebase.FakeAppInstanceIdProvider
import com.fab.wab.merchant.core.firebase.FakePushTokenProvider
import kotlinx.coroutines.test.runTest
import kotlin.test.Test
import kotlin.test.assertEquals
import kotlin.test.assertNull
import kotlin.test.assertTrue

/** MER-075 e2e: iOS without Firebase signed in with installation "unknown" and the server answered VALIDATION_ERROR. */
class AppInstallationInfoProviderTest {
    private val environment = AppEnvironment("dev", "https://api.example", "https://web.example", "1.2.3", 7, isDebug = true)
    private val contractId = Regex("^[A-Za-z0-9._-]{8,128}$")

    private fun provider(firebaseId: String?, token: String?) = AppInstallationInfoProvider(
        environment = environment,
        platform = ClientPlatform.IOS,
        appInstanceId = FakeAppInstanceIdProvider(firebaseId),
        pushToken = FakePushTokenProvider(token),
        osVersion = "26.0",
        deviceModel = "",
        localId = { LOCAL_ID },
    )

    @Test
    fun withoutFirebaseTheDevicesOwnIdAndARealPlatformAreSent() = runTest {
        val info = provider(firebaseId = null, token = "").current()
        assertEquals(LOCAL_ID, info.installationId)
        assertTrue(contractId.matches(info.installationId))
        assertEquals("IOS", info.platform)
        assertNull(info.fcmToken, "an empty token is left out (contract minLength 1)")
        assertNull(info.deviceModel)
    }

    @Test
    fun theFirebaseIdWinsWhenThereIsOne() = runTest {
        assertEquals("firebase-instance-1", provider(firebaseId = "firebase-instance-1", token = "t").current().installationId)
    }

    @Test
    fun theLocalIdIsCreatedOnceAndReused() = runTest {
        var stored: String? = null
        var created = 0
        val first = storedOrNewId({ stored }, { stored = it }, { created++; LOCAL_ID })
        val second = storedOrNewId({ stored }, { stored = it }, { created++; "other-id-123" })
        assertEquals(LOCAL_ID, first)
        assertEquals(LOCAL_ID, second)
        assertEquals(1, created)
    }

    private companion object {
        const val LOCAL_ID = "3f2a6c1e-8d4b-4c2a-9e7f-1b2c3d4e5f60"
    }
}
