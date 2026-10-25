package com.fab.wab.merchant.core.data.config

import com.fab.wab.merchant.core.data.contract.generated.GetConfigData
import com.fab.wab.merchant.core.data.contract.generated.GetConfigDataMaintenance
import com.fab.wab.merchant.core.data.contract.generated.GetConfigDataOtp
import com.fab.wab.merchant.core.data.contract.generated.GetConfigDataUpdate
import com.fab.wab.merchant.core.domain.config.UpdateStatus
import kotlin.test.Test
import kotlin.test.assertEquals
import kotlin.test.assertNull

class AppConfigMapperTest {
    private val dto = GetConfigData(
        update = GetConfigDataUpdate(status = "UPDATE_REQUIRED", latest = "2.0.0", minSupported = "1.5.0", storeUrl = " "),
        maintenance = GetConfigDataMaintenance(enabled = true, message = ""),
        nearbyRadiusKm = 5.0,
        otp = GetConfigDataOtp(length = 6.0, resendAfterSeconds = 60.0),
    )

    @Test
    fun numbersBecomeIntsAndBlankTextsBecomeNull() {
        val config = dto.toDomain()
        assertEquals(UpdateStatus.UPDATE_REQUIRED, config.update.status)
        assertNull(config.update.storeUrl)
        assertNull(config.maintenance.message)
        assertEquals(6, config.otp.length)
        assertEquals(60, config.otp.resendAfterSeconds)
        assertNull(config.contact)
    }

    @Test
    fun unknownUpdateStatusNeverBlocks() {
        assertEquals(UpdateStatus.OK, dto.copy(update = dto.update.copy(status = "SOMETHING_NEW")).toDomain().update.status)
    }
}
