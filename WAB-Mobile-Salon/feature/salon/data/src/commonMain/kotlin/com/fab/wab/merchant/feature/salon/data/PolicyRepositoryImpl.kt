package com.fab.wab.merchant.feature.salon.data

import com.fab.wab.merchant.core.data.BaseResponse
import com.fab.wab.merchant.core.data.contract.generated.GetSalonPolicyData
import com.fab.wab.merchant.core.data.contract.generated.MerchantOperations
import com.fab.wab.merchant.core.data.contract.generated.PutSalonPolicyBody
import com.fab.wab.merchant.core.data.contract.generated.PutSalonPolicyData
import com.fab.wab.merchant.core.domain.AppResult
import com.fab.wab.merchant.core.domain.mapSuccess
import com.fab.wab.merchant.core.domain.salon.SalonRepository
import com.fab.wab.merchant.core.network.safeApiCall
import com.fab.wab.merchant.core.domain.policy.FullPaymentRefund
import com.fab.wab.merchant.core.domain.policy.NoShowDeposit
import com.fab.wab.merchant.core.domain.policy.NoShowFullPayment
import com.fab.wab.merchant.core.domain.policy.PaymentOption
import com.fab.wab.merchant.core.domain.policy.PaymentOption.DEPOSIT
import com.fab.wab.merchant.feature.salon.domain.PolicyDraft
import com.fab.wab.merchant.feature.salon.domain.PolicyRepository
import com.fab.wab.merchant.feature.salon.domain.SalonPolicy
import io.ktor.client.HttpClient
import io.ktor.client.call.body
import io.ktor.client.request.get
import io.ktor.client.request.put
import io.ktor.client.request.setBody

class PolicyApi(private val client: HttpClient) {
    suspend fun policy(): BaseResponse<GetSalonPolicyData?> = client.get(MerchantOperations.getSalonPolicy.path).body()

    suspend fun save(body: PutSalonPolicyBody): BaseResponse<PutSalonPolicyData> =
        client.put(MerchantOperations.putSalonPolicy.path) { setBody(body) }.body()
}

private inline fun <reified T : Enum<T>> enumOf(
    value: String,
    fallback: T,
): T = enumValues<T>().firstOrNull { it.name == value.uppercase() } ?: fallback

/** The fields both policy DTOs share, before parsing (one mapper for GET and PUT). */
private data class RawPolicy(
    val window: Double, val options: List<String>, val deposit: Double?, val depositRefundable: Boolean, val fullRefund: String,
    val noShowDeposit: String, val noShowFull: String, val notes: String?,
)

private fun RawPolicy.toDomain() = SalonPolicy(
    windowHours = window.toInt(),
    options = options.mapNotNull { code -> PaymentOption.entries.firstOrNull { it.name == code.uppercase() } }.toSet(),
    depositPercentage = deposit?.toInt(),
    depositRefundable = depositRefundable,
    fullRefund = enumOf(fullRefund, FullPaymentRefund.FULL),
    noShowDeposit = enumOf(noShowDeposit, NoShowDeposit.KEEP),
    noShowFull = enumOf(noShowFull, NoShowFullPayment.KEEP),
    notes = notes.orEmpty(),
)

fun GetSalonPolicyData.toDomain() = RawPolicy(
    cancellationWindowHours, paymentOptions, depositPercentage, depositRefundableOnCustomerCancel,
    fullPaymentRefundOnCustomerCancel, noShowDeposit, noShowFullPayment, notes,
).toDomain()

fun PutSalonPolicyData.toDomain() = RawPolicy(
    cancellationWindowHours, paymentOptions, depositPercentage, depositRefundableOnCustomerCancel,
    fullPaymentRefundOnCustomerCancel, noShowDeposit, noShowFullPayment, notes,
).toDomain()

/** PUT replaces the policy: the deposit percentage only travels while DEPOSIT is offered; empty notes clear them. */
fun PolicyDraft.toBody(): PutSalonPolicyBody = PutSalonPolicyBody(
    cancellationWindowHours = windowHours.trim().toInt(),
    paymentOptions = options.map { it.name },
    depositPercentage = if (DEPOSIT in options) depositPercentage.trim().toIntOrNull() else null,
    depositRefundableOnCustomerCancel = depositRefundable,
    fullPaymentRefundOnCustomerCancel = fullRefund.name,
    noShowDeposit = noShowDeposit.name,
    noShowFullPayment = noShowFull.name,
    notes = notes.trim(),
)

/** Saving refreshes the shared salon (completeness `POLICY`). */
class PolicyRepositoryImpl(private val api: PolicyApi, private val salon: SalonRepository) : PolicyRepository {
    override suspend fun policy(): AppResult<SalonPolicy?> = safeApiCall { api.policy() }.mapSuccess { it.data?.toDomain() }

    override suspend fun save(draft: PolicyDraft): AppResult<SalonPolicy> =
        safeApiCall { api.save(draft.toBody()) }.mapSuccess { it.data.toDomain() }.also { if (it is AppResult.Success) salon.refresh() }
}
