package com.fab.wab.merchant.feature.finance.data

import com.fab.wab.merchant.core.data.contract.generated.GetFinanceBalanceData
import com.fab.wab.merchant.core.data.contract.generated.GetFinancePayoutsDataItem
import com.fab.wab.merchant.core.data.contract.generated.GetFinanceRefundsDataItem
import com.fab.wab.merchant.core.data.contract.generated.GetFinanceTransactionsDataItem
import com.fab.wab.merchant.core.data.mock.decodeFixture
import kotlinx.serialization.serializer
import kotlin.test.Test
import kotlin.test.assertEquals
import kotlin.test.assertNotNull
import kotlin.test.assertTrue

/** MER-054: the finance mappers on responses captured from the local real stack (core/data/fixtures/remote). */
class RealFinanceFixturesTest {

    @Test
    fun balanceAndEveryRowMap() {
        assertNotNull(decodeFixture("GetFinanceBalance", serializer<GetFinanceBalanceData>()).data.toDomain())
        val transactions = decodeFixture("GetFinanceTransactions", serializer<List<GetFinanceTransactionsDataItem>>()).data
        assertTrue(transactions.isNotEmpty())
        assertEquals(transactions.size, transactions.mapNotNull { it.toDomain() }.size)
        val refunds = decodeFixture("GetFinanceRefunds", serializer<List<GetFinanceRefundsDataItem>>()).data
        assertEquals(refunds.size, refunds.mapNotNull { it.toDomain() }.size)
        val payouts = decodeFixture("GetFinancePayouts", serializer<List<GetFinancePayoutsDataItem>>()).data
        assertEquals(payouts.size, payouts.mapNotNull { it.toDomain() }.size)
    }
}
