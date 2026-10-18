package com.fab.wab.customer.core.data

import com.fab.wab.customer.core.data.config.toDomain
import com.fab.wab.customer.core.data.contract.generated.GetConfigData
import com.fab.wab.customer.core.data.contract.generated.GetConfigDataContact
import com.fab.wab.customer.core.data.contract.generated.GetConfigDataMaintenance
import com.fab.wab.customer.core.data.contract.generated.GetConfigDataOtp
import com.fab.wab.customer.core.data.contract.generated.GetConfigDataUpdate
import com.fab.wab.customer.core.domain.config.UpdateStatus
import kotlin.test.Test
import kotlin.test.assertEquals
import kotlin.test.assertNull

class AppConfigMapperTest {

    @Test
    fun contractValuesBecomeDomainTypes() {
        val dto = GetConfigData(
            update = GetConfigDataUpdate(status = "UPDATE_REQUIRED", latest = "2.0.0", minSupported = "1.5.0", storeUrl = " "),
            maintenance = GetConfigDataMaintenance(enabled = true, message = ""),
            nearbyRadiusKm = 7.5,
            otp = GetConfigDataOtp(length = 6.0, resendAfterSeconds = 60.0),
            contact = GetConfigDataContact(phone = "+962790000000", whatsapp = "+962790000000", email = "hi@example.invalid"),
        )
        val config = dto.toDomain()
        assertEquals(UpdateStatus.UPDATE_REQUIRED, config.update.status)
        assertNull(config.update.storeUrl)
        assertEquals(true, config.maintenance.enabled)
        assertNull(config.maintenance.message)
        assertEquals(6, config.otp.length)
        assertEquals(60, config.otp.resendAfterSeconds)
        assertEquals(7.5, config.nearbyRadiusKm)
        assertEquals("hi@example.invalid", config.contact?.email)
    }
}
