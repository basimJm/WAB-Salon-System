package com.fab.wab.merchant.feature.application.data.remote

import com.fab.wab.merchant.core.data.BaseResponse
import com.fab.wab.merchant.core.data.contract.generated.GetSalonApplicationData
import com.fab.wab.merchant.core.data.contract.generated.MerchantOperations
import com.fab.wab.merchant.core.data.contract.generated.PostSalonApplicationResubmitBody
import com.fab.wab.merchant.core.data.contract.generated.PostSalonApplicationResubmitData
import com.fab.wab.merchant.core.data.contract.generated.PostSalonApplicationsBody
import com.fab.wab.merchant.core.data.contract.generated.PostSalonApplicationsData
import io.ktor.client.HttpClient
import io.ktor.client.call.body
import io.ktor.client.request.get
import io.ktor.client.request.post
import io.ktor.client.request.setBody

/** Salon application operations (PRD M04, M05). */
class ApplicationApi(private val client: HttpClient) {
    suspend fun apply(body: PostSalonApplicationsBody): BaseResponse<PostSalonApplicationsData> =
        client.post(MerchantOperations.postSalonApplications.path) { setBody(body) }.body()

    suspend fun current(): BaseResponse<GetSalonApplicationData> =
        client.get(MerchantOperations.getSalonApplication.path).body()

    suspend fun resubmit(body: PostSalonApplicationResubmitBody): BaseResponse<PostSalonApplicationResubmitData> =
        client.post(MerchantOperations.postSalonApplicationResubmit.path) { setBody(body) }.body()
}
