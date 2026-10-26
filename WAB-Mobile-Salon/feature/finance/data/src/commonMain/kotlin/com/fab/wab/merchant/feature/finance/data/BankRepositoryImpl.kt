package com.fab.wab.merchant.feature.finance.data

import com.fab.wab.merchant.core.data.BaseResponse
import com.fab.wab.merchant.core.data.contract.generated.GetSalonPayoutDetailsData
import com.fab.wab.merchant.core.data.contract.generated.GetTeamMembersByIdData
import com.fab.wab.merchant.core.data.contract.generated.MerchantOperations
import com.fab.wab.merchant.core.data.contract.generated.PutSalonPayoutDetailsBody
import com.fab.wab.merchant.core.data.contract.generated.PutSalonPayoutDetailsData
import com.fab.wab.merchant.core.data.contract.pathWith
import com.fab.wab.merchant.core.domain.AppResult
import com.fab.wab.merchant.core.domain.mapSuccess
import com.fab.wab.merchant.core.network.safeApiCall
import com.fab.wab.merchant.feature.finance.domain.BankDetails
import com.fab.wab.merchant.feature.finance.domain.BankDraft
import com.fab.wab.merchant.feature.finance.domain.BankRepository
import com.fab.wab.merchant.feature.finance.domain.normalizeIban
import io.ktor.client.HttpClient
import io.ktor.client.call.body
import io.ktor.client.request.get
import io.ktor.client.request.put
import io.ktor.client.request.setBody

private const val ID = "id"

class BankApi(private val client: HttpClient) {
    suspend fun details(): BaseResponse<GetSalonPayoutDetailsData?> = client.get(MerchantOperations.getSalonPayoutDetails.path).body()

    suspend fun save(body: PutSalonPayoutDetailsBody): BaseResponse<PutSalonPayoutDetailsData> =
        client.put(MerchantOperations.putSalonPayoutDetails.path) { setBody(body) }.body()

    suspend fun member(id: String): BaseResponse<GetTeamMembersByIdData> = client.get(
        MerchantOperations.getTeamMembersById.pathWith(ID to id),
    ).body()
}

class BankRepositoryImpl(private val api: BankApi) : BankRepository {
    override suspend fun details(): AppResult<BankDetails?> =
        safeApiCall {
            api.details()
        }.mapSuccess { response -> response.data?.let { BankDetails(it.bankName, it.accountHolderName, it.ibanLast4) } }

    override suspend fun save(draft: BankDraft, otpToken: String): AppResult<BankDetails> =
        safeApiCall {
            api.save(PutSalonPayoutDetailsBody(draft.bankName.trim(), draft.accountHolder.trim(), normalizeIban(draft.iban), otpToken))
        }
            .mapSuccess { BankDetails(it.data.bankName, it.data.accountHolderName, it.data.ibanLast4) }

    override suspend fun phoneOf(memberId: String): AppResult<String> = safeApiCall { api.member(memberId) }.mapSuccess { it.data.phone }
}
