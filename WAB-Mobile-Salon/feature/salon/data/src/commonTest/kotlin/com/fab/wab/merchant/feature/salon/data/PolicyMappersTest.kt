package com.fab.wab.merchant.feature.salon.data

import com.fab.wab.merchant.core.data.contract.generated.GetSalonPolicyData
import com.fab.wab.merchant.feature.salon.domain.NoShowFullPayment
import com.fab.wab.merchant.feature.salon.domain.PaymentOption
import com.fab.wab.merchant.feature.salon.domain.PolicyDraft
import kotlin.test.Test
import kotlin.test.assertEquals
import kotlin.test.assertNull

class PolicyMappersTest {

    @Test
    fun policyMapsAndUnknownValuesFallBack() {
        val policy = GetSalonPolicyData(24.0, listOf("DEPOSIT", "BITCOIN"), 20.0, true, "FULL", "KEEP", "SOMETHING", null).toDomain()
        assertEquals(setOf(PaymentOption.DEPOSIT), policy.options)
        assertEquals(20, policy.depositPercentage)
        assertEquals(NoShowFullPayment.KEEP, policy.noShowFull)
        assertEquals("", policy.notes)
    }

    @Test
    fun depositOnlyTravelsWithTheDepositOption() {
        assertNull(PolicyDraft(options = setOf(PaymentOption.FULL_ONLINE), depositPercentage = "30").toBody().depositPercentage)
        assertEquals(30, PolicyDraft(options = setOf(PaymentOption.DEPOSIT), depositPercentage = "30").toBody().depositPercentage)
    }
}
