package com.fab.wab.merchant.core.data.contract

import com.fab.wab.merchant.core.data.branch.toDomain
import com.fab.wab.merchant.core.data.config.toDomain
import com.fab.wab.merchant.core.data.contract.generated.GetBranchesByBranchIdData
import com.fab.wab.merchant.core.data.contract.generated.GetConfigData
import com.fab.wab.merchant.core.data.contract.generated.GetSalonData
import com.fab.wab.merchant.core.data.mock.decodeFixture
import com.fab.wab.merchant.core.data.salon.toDomain
import com.fab.wab.merchant.core.domain.session.SalonState
import kotlinx.serialization.serializer
import kotlin.test.Test
import kotlin.test.assertEquals
import kotlin.test.assertFalse
import kotlin.test.assertTrue

/** MER-054: core mappers (config, salon, branches) on responses captured from the local real stack. */
class RealCoreFixturesTest {

    @Test
    fun configFixtureIsNotInMaintenance() {
        // The fixture comes from the local stack: the hosted dev API had maintenance on, which would block mock mode.
        val config = decodeFixture("GetConfig", serializer<GetConfigData>()).data.toDomain()
        assertFalse(config.maintenance.enabled)
        assertTrue(config.otp.length > 0)
    }

    @Test
    fun salonAndBranchesMap() {
        val salon = decodeFixture("GetSalon", serializer<GetSalonData>()).data.toDomain()
        assertEquals(SalonState.LIVE, salon.state)
        val branches = decodeFixture("GetBranches", serializer<List<GetBranchesByBranchIdData>>()).data.map { it.toDomain() }
        assertEquals(1, branches.count { it.isMain })
        assertTrue(branches.size > 1, "the demo salon has several branches")
    }
}
