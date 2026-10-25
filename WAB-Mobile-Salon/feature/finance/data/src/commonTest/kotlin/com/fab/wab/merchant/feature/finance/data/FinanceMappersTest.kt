package com.fab.wab.merchant.feature.finance.data

import com.fab.wab.merchant.core.data.contract.generated.GetFinanceBalanceData
import com.fab.wab.merchant.core.data.contract.generated.GetFinanceBalanceDataLastPayout
import com.fab.wab.merchant.core.data.contract.generated.GetFinanceRefundsDataItem
import com.fab.wab.merchant.core.domain.booking.RefundStatus
import com.fab.wab.merchant.feature.finance.domain.PayoutStatus
import com.fab.wab.merchant.feature.finance.domain.RefundSource
import kotlin.test.Test
import kotlin.test.assertEquals
import kotlin.test.assertNull

class FinanceMappersTest {

    @Test
    fun balanceAndRefundsMapWithFallbacks() {
        val balance = GetFinanceBalanceData(
            "10.000",
            "5.000",
            "20.000",
            "1.000",
            "2.000",
            "8.000",
            GetFinanceBalanceDataLastPayout("8.000", "2026-10-01", "TRANSFERRED"),
        ).toDomain()
        assertEquals(PayoutStatus.TRANSFERRED, balance.lastPayoutStatus)
        assertEquals("2026-10-01", balance.lastPayoutDate)
        val refund = GetFinanceRefundsDataItem(
            "r1",
            "b1",
            "WAB-1",
            "5.000",
            "SALON_REJECT",
            " ",
            "REFUNDED",
            "2026-10-02T10:00:00Z",
            null,
        ).toDomain()
        assertEquals(RefundSource.SALON_REJECT, refund.source)
        assertEquals(RefundStatus.REFUNDED, refund.status)
        assertNull(refund.reason)
        assertEquals(
            RefundSource.OTHER,
            GetFinanceRefundsDataItem("r2", null, null, "1.000", "NEW_THING", null, "WHAT", "x", null).toDomain().source,
        )
    }
}
