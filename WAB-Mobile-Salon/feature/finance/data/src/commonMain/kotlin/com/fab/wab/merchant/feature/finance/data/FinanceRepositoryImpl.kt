package com.fab.wab.merchant.feature.finance.data

import com.fab.wab.merchant.core.data.BaseResponse
import com.fab.wab.merchant.core.data.contract.generated.GetFinanceBalanceData
import com.fab.wab.merchant.core.data.contract.generated.GetFinancePayoutsDataItem
import com.fab.wab.merchant.core.data.contract.generated.GetFinanceRefundsDataItem
import com.fab.wab.merchant.core.data.contract.generated.GetFinanceTransactionsDataItem
import com.fab.wab.merchant.core.data.contract.generated.MerchantOperations
import com.fab.wab.merchant.core.domain.AppResult
import com.fab.wab.merchant.core.domain.booking.RefundStatus
import com.fab.wab.merchant.core.domain.mapSuccess
import com.fab.wab.merchant.core.network.safeApiCall
import com.fab.wab.merchant.feature.finance.domain.FinanceBalance
import com.fab.wab.merchant.feature.finance.domain.FinanceDefaults
import com.fab.wab.merchant.feature.finance.domain.FinanceRepository
import com.fab.wab.merchant.feature.finance.domain.PaymentType
import com.fab.wab.merchant.feature.finance.domain.Payout
import com.fab.wab.merchant.feature.finance.domain.PayoutStatus
import com.fab.wab.merchant.feature.finance.domain.Refund
import com.fab.wab.merchant.feature.finance.domain.RefundSource
import com.fab.wab.merchant.feature.finance.domain.Transaction
import io.ktor.client.HttpClient
import io.ktor.client.call.body
import io.ktor.client.request.HttpRequestBuilder
import io.ktor.client.request.get
import io.ktor.client.request.parameter
import kotlinx.datetime.LocalDate

/** Query names of the `GET /finance` lists (contract). */
internal object FinanceParams {
    const val PAGE = "page"
    const val PAGE_SIZE = "pageSize"
    const val FROM = "from"
    const val TO = "to"
    const val BRANCH_ID = "branchId"
}

class FinanceApi(private val client: HttpClient) {
    suspend fun balance(): BaseResponse<GetFinanceBalanceData> = client.get(MerchantOperations.getFinanceBalance.path).body()

    suspend fun transactions(
        from: LocalDate,
        to: LocalDate,
        page: Int,
        branchId: String?,
    ): BaseResponse<List<GetFinanceTransactionsDataItem>> = client.get(MerchantOperations.getFinanceTransactions.path) {
        range(from, to, page)
        branchId?.let { parameter(FinanceParams.BRANCH_ID, it) }
    }.body()

    suspend fun refunds(from: LocalDate, to: LocalDate, page: Int, branchId: String?): BaseResponse<List<GetFinanceRefundsDataItem>> =
        client.get(MerchantOperations.getFinanceRefunds.path) {
            range(from, to, page)
            branchId?.let { parameter(FinanceParams.BRANCH_ID, it) }
        }.body()

    suspend fun payouts(from: LocalDate, to: LocalDate, page: Int): BaseResponse<List<GetFinancePayoutsDataItem>> =
        client.get(MerchantOperations.getFinancePayouts.path) { range(from, to, page) }.body()
}

private fun HttpRequestBuilder.range(from: LocalDate, to: LocalDate, page: Int) {
    parameter(FinanceParams.PAGE, page)
    parameter(FinanceParams.PAGE_SIZE, FinanceDefaults.PAGE_SIZE)
    parameter(FinanceParams.FROM, from.toString())
    parameter(FinanceParams.TO, to.toString())
}

private inline fun <reified T : Enum<T>> enumOf(
    value: String?,
    fallback: T,
): T = enumValues<T>().firstOrNull { it.name == value?.uppercase() } ?: fallback

fun GetFinanceBalanceData.toDomain() = FinanceBalance(
    balance = balance,
    dueNow = dueNow,
    collected = collected,
    gatewayFees = gatewayFees,
    refunds = refunds,
    paidOut = paidOut,
    lastPayoutNet = lastPayout?.net,
    lastPayoutDate = lastPayout?.periodTo,
    lastPayoutStatus = lastPayout?.status?.let { enumOf(it, PayoutStatus.PENDING) },
)

fun GetFinanceTransactionsDataItem.toDomain() =
    Transaction(id, bookingId, referenceNumber, enumOf(type, PaymentType.FULL), amount, gatewayFee, net, createdAt)

fun GetFinanceRefundsDataItem.toDomain() = Refund(
    id = id,
    bookingId = bookingId,
    reference = referenceNumber,
    amount = amount,
    source = enumOf(source, RefundSource.OTHER),
    reason = reason?.takeIf { it.isNotBlank() },
    status = RefundStatus.fromCode(status).takeIf { it != RefundStatus.NONE } ?: RefundStatus.REFUND_PENDING,
    createdAt = createdAt,
    completedAt = completedAt,
)

fun GetFinancePayoutsDataItem.toDomain() =
    Payout(
        id,
        periodFrom,
        periodTo,
        gross,
        fees,
        refunds,
        adjustments,
        net,
        enumOf(status, PayoutStatus.PENDING),
        transferredAt,
        transferReference,
    )

class FinanceRepositoryImpl(private val api: FinanceApi) : FinanceRepository {
    override suspend fun balance(): AppResult<FinanceBalance> = safeApiCall { api.balance() }.mapSuccess { it.data.toDomain() }

    override suspend fun transactions(from: LocalDate, to: LocalDate, page: Int, branchId: String?): AppResult<List<Transaction>> =
        safeApiCall { api.transactions(from, to, page, branchId) }.mapSuccess { response -> response.data.map { it.toDomain() } }

    override suspend fun refunds(from: LocalDate, to: LocalDate, page: Int, branchId: String?): AppResult<List<Refund>> =
        safeApiCall { api.refunds(from, to, page, branchId) }.mapSuccess { response -> response.data.map { it.toDomain() } }

    override suspend fun payouts(from: LocalDate, to: LocalDate, page: Int): AppResult<List<Payout>> =
        safeApiCall { api.payouts(from, to, page) }.mapSuccess { response -> response.data.map { it.toDomain() } }
}
