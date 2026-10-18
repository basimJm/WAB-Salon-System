package com.fab.wab.customer.feature.auth.data

import com.fab.wab.customer.feature.auth.data.repository.toPutBody
import com.fab.wab.customer.feature.auth.domain.model.InstallationInfo
import kotlin.test.Test
import kotlin.test.assertEquals
import kotlin.test.assertNull

class InstallationMapperTest {

    @Test
    fun installationBodyCarriesTheLanguageAndOptionalFacts() {
        val info = InstallationInfo("inst", "IOS", "1.2.3", osVersion = "17.0", deviceModel = "iPhone", fcmToken = "fcm")
        val body = info.toPutBody("en")
        assertEquals("inst", body.installationId)
        assertEquals("IOS", body.platform)
        assertEquals("en", body.language)
        assertEquals("fcm", body.fcmToken)
        assertNull(InstallationInfo("inst", "ANDROID", "1.0").toPutBody(" ").language)
    }
}
