package com.fab.wab.merchant.core.domain.policy

import kotlin.test.Test
import kotlin.test.assertEquals
import kotlin.test.assertNull

class PolicyTermsTest {

    private val all = PolicyTerms(
        windowHours = 12,
        options = setOf(PaymentOption.PAY_ON_ARRIVAL, PaymentOption.DEPOSIT, PaymentOption.FULL_ONLINE),
        depositPercentage = 30,
        depositRefundable = true,
        fullRefund = FullPaymentRefund.MINUS_DEPOSIT,
        noShowDeposit = NoShowDeposit.KEEP,
        noShowFull = NoShowFullPayment.REFUND_MINUS_DEPOSIT,
    )

    @Test
    fun everyOfferedOptionGetsItsLinesInOrder() {
        assertEquals(
            listOf(
                PolicyRule.Window(12), PolicyRule.PayOnArrival, PolicyRule.Deposit(30), PolicyRule.FullOnline,
                PolicyRule.DepositOnCancel(true), PolicyRule.FullOnCancel(FullPaymentRefund.MINUS_DEPOSIT),
                PolicyRule.DepositOnNoShow(NoShowDeposit.KEEP), PolicyRule.FullOnNoShow(NoShowFullPayment.REFUND_MINUS_DEPOSIT),
            ),
            all.customerRules(),
        )
    }

    @Test
    fun linesOfOptionsNotOfferedOrUnknownAreLeftOut() {
        val arrivalOnly = all.copy(options = setOf(PaymentOption.PAY_ON_ARRIVAL), windowHours = null)
        assertEquals(listOf(PolicyRule.PayOnArrival), arrivalOnly.customerRules())
        val depositUnknown = all.copy(options = setOf(PaymentOption.DEPOSIT), depositRefundable = null, noShowDeposit = null)
        assertEquals(listOf(PolicyRule.Window(12), PolicyRule.Deposit(30)), depositUnknown.customerRules())
    }

    @Test
    fun codesMapTolerantly() {
        assertEquals(NoShowDeposit.REFUND, enumOfCode<NoShowDeposit>("REFUND"))
        assertNull(enumOfCode<NoShowDeposit>("SOMETHING_NEW"))
        assertNull(enumOfCode<PaymentOption>(null))
    }
}
