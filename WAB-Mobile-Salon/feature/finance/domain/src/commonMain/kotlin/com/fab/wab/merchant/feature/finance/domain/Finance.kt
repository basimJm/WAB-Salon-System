package com.fab.wab.merchant.feature.finance.domain

import com.fab.wab.merchant.core.domain.AppResult
import com.fab.wab.merchant.core.domain.booking.RefundStatus
import kotlinx.datetime.DatePeriod
import kotlinx.datetime.LocalDate
import kotlinx.datetime.minus
import kotlinx.datetime.plus

enum class PayoutStatus { PENDING, TRANSFERRED }

/** Amounts are the contract's JOD decimal strings (tax inclusive, three decimals). */
data class FinanceBalance(
    val balance: String,
    val dueNow: String,
    val collected: String,
    val gatewayFees: String,
    val refunds: String,
    val paidOut: String,
    val lastPayoutNet: String?,
    val lastPayoutDate: String?,
    val lastPayoutStatus: PayoutStatus?,
)

enum class PaymentType { DEPOSIT, FULL }

data class Transaction(
    val id: String,
    val bookingId: String?,
    val reference: String?,
    val type: PaymentType,
    val amount: String,
    val gatewayFee: String,
    val net: String,
    val createdAt: String,
)

/** Why the money went back (server `REFUND_SOURCES`). */
enum class RefundSource { SALON_REJECT, SALON_CANCEL, AUTO_CANCEL, CUSTOMER_CANCEL, NO_SHOW_POLICY, ADMIN, OTHER }

data class Refund(
    val id: String,
    val bookingId: String?,
    val reference: String?,
    val amount: String,
    val source: RefundSource,
    val reason: String?,
    val status: RefundStatus,
    val createdAt: String,
    val completedAt: String?,
)

data class Payout(
    val id: String,
    val periodFrom: String?,
    val periodTo: String?,
    val gross: String,
    val fees: String,
    val refunds: String,
    val adjustments: String,
    val net: String,
    val status: PayoutStatus,
    val transferredAt: String?,
    val transferReference: String?,
)

enum class FinanceTab { TRANSACTIONS, REFUNDS, PAYOUTS }

/** Date filter presets of design 08 (`ranges`). */
enum class FinanceRange { THIS_MONTH, LAST_3_MONTHS, THIS_YEAR, CUSTOM }

private const val MONTHS_BACK = 2

/** Inclusive [from]..[to] of a preset relative to [today] (custom keeps the chosen dates). */
fun FinanceRange.dates(today: LocalDate): Pair<LocalDate, LocalDate>? = when (this) {
    FinanceRange.THIS_MONTH -> LocalDate(today.year, today.month, 1) to today
    FinanceRange.LAST_3_MONTHS -> LocalDate(today.year, today.month, 1).minus(DatePeriod(months = MONTHS_BACK)) to today
    FinanceRange.THIS_YEAR -> LocalDate(today.year, 1, 1) to today
    FinanceRange.CUSTOM -> null
}

/** First day after [date] (helper for inclusive ranges). */
fun LocalDate.nextDay(): LocalDate = plus(DatePeriod(days = 1))

object FinanceDefaults {
    const val FIRST_PAGE = 1
    const val PAGE_SIZE = 20
}

/** The `/finance` endpoints (FINANCE_VIEW). */
interface FinanceRepository {
    suspend fun balance(): AppResult<FinanceBalance>

    suspend fun transactions(from: LocalDate, to: LocalDate, page: Int): AppResult<List<Transaction>>

    suspend fun refunds(from: LocalDate, to: LocalDate, page: Int): AppResult<List<Refund>>

    suspend fun payouts(from: LocalDate, to: LocalDate, page: Int): AppResult<List<Payout>>
}
