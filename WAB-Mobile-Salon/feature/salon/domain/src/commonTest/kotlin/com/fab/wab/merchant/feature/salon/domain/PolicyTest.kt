package com.fab.wab.merchant.feature.salon.domain

import kotlin.test.Test
import kotlin.test.assertEquals
import kotlin.test.assertNull
import kotlin.test.assertTrue

class PolicyTest {

    @Test
    fun validationRules() {
        assertTrue(policyErrors(PolicyDraft()).isEmpty())
        assertEquals(setOf(PolicyField.WINDOW, PolicyField.OPTIONS), policyErrors(PolicyDraft(windowHours = "0", options = emptySet())))
        assertEquals(setOf(PolicyField.WINDOW), policyErrors(PolicyDraft(windowHours = "721")))
        assertEquals(setOf(PolicyField.DEPOSIT), policyErrors(PolicyDraft(options = setOf(PaymentOption.DEPOSIT), depositPercentage = "101")))
        assertTrue(policyErrors(PolicyDraft(options = setOf(PaymentOption.FULL_ONLINE), depositPercentage = "")).isEmpty())
        assertEquals(setOf(PolicyField.NOTES), policyErrors(PolicyDraft(notes = "n".repeat(PolicyLimits.NOTES_MAX + 1))))
    }

    @Test
    fun depositExampleIsIntegerFils() {
        assertEquals(10_000L, depositExampleFils("20"))
        assertEquals(16_500L, depositExampleFils("33"))
        assertNull(depositExampleFils("0"))
    }

    @Test
    fun rulesFollowTheOfferedOptions() {
        val arrivalOnly = customerRules(PolicyDraft())
        assertEquals(listOf(PolicyRule.Window(24), PolicyRule.PayOnArrival), arrivalOnly)
        val all = customerRules(
            PolicyDraft(
                windowHours = "12",
                options = PaymentOption.entries.toSet(),
                depositPercentage = "20",
                depositRefundable = false,
                fullRefund = FullPaymentRefund.MINUS_DEPOSIT,
                noShowDeposit = NoShowDeposit.REFUND,
                noShowFull = NoShowFullPayment.REFUND_FULL,
            ),
        )
        assertEquals(
            listOf(
                PolicyRule.Window(12), PolicyRule.PayOnArrival, PolicyRule.Deposit(20), PolicyRule.FullOnline,
                PolicyRule.DepositOnCancel(false), PolicyRule.FullOnCancel(FullPaymentRefund.MINUS_DEPOSIT),
                PolicyRule.DepositOnNoShow(NoShowDeposit.REFUND), PolicyRule.FullOnNoShow(NoShowFullPayment.REFUND_FULL),
            ),
            all,
        )
    }
}
