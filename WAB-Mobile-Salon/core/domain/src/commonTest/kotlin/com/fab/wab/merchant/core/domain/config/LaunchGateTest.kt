package com.fab.wab.merchant.core.domain.config

import kotlin.test.Test
import kotlin.test.assertEquals

class LaunchGateTest {

    private val base = AppConfig(
        update = UpdatePolicy(UpdateStatus.OK, storeUrl = "https://store.example/app"),
        maintenance = MaintenancePolicy(enabled = false),
        nearbyRadiusKm = 5.0,
        otp = OtpConfig(length = 6, resendAfterSeconds = 60),
    )

    @Test
    fun maintenanceBlocksBeforeAnyUpdateDecision() {
        val config = base.copy(
            update = base.update.copy(status = UpdateStatus.UPDATE_REQUIRED),
            maintenance = MaintenancePolicy(enabled = true, message = "back soon"),
        )
        assertEquals(LaunchGate.Maintenance("back soon"), launchGateOf(config))
    }

    @Test
    fun versionPolicyMapsToForceOptionalOrReady() {
        assertEquals(LaunchGate.Ready, launchGateOf(base))
        assertEquals(
            LaunchGate.ForceUpdate("https://store.example/app"),
            launchGateOf(base.copy(update = base.update.copy(status = UpdateStatus.UPDATE_REQUIRED))),
        )
        assertEquals(
            LaunchGate.OptionalUpdate("https://store.example/app"),
            launchGateOf(base.copy(update = base.update.copy(status = UpdateStatus.UPDATE_AVAILABLE))),
        )
    }

    @Test
    fun unknownStatusesNeverBlock() {
        assertEquals(UpdateStatus.OK, UpdateStatus.fromCode("SOMETHING_NEW"))
        assertEquals(UpdateStatus.OK, UpdateStatus.fromCode(null))
        assertEquals(UpdateStatus.UPDATE_REQUIRED, UpdateStatus.fromCode("update_required"))
    }
}
