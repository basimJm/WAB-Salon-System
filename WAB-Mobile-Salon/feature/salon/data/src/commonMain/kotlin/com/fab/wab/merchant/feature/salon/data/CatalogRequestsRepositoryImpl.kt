package com.fab.wab.merchant.feature.salon.data

import com.fab.wab.merchant.core.data.BaseResponse
import com.fab.wab.merchant.core.data.contract.generated.GetCatalogRequestsDataItem
import com.fab.wab.merchant.core.data.contract.generated.MerchantOperations
import com.fab.wab.merchant.core.data.contract.generated.PostCatalogRequestsBody
import com.fab.wab.merchant.core.data.contract.generated.PostCatalogRequestsData
import com.fab.wab.merchant.core.domain.AppError
import com.fab.wab.merchant.core.domain.AppResult
import com.fab.wab.merchant.core.domain.mapSuccess
import com.fab.wab.merchant.core.network.safeApiCall
import com.fab.wab.merchant.feature.salon.domain.CatalogRequest
import com.fab.wab.merchant.feature.salon.domain.CatalogRequestStatus
import com.fab.wab.merchant.feature.salon.domain.CatalogRequestsRepository
import com.fab.wab.merchant.feature.salon.domain.ServiceLimits
import io.ktor.client.HttpClient
import io.ktor.client.call.body
import io.ktor.client.request.get
import io.ktor.client.request.parameter
import io.ktor.client.request.post
import io.ktor.client.request.setBody

private const val PAGE = "page"
private const val PAGE_SIZE = "pageSize"

/** Diagnostic text for a status the app does not know (never shown to users). */
private const val UNREADABLE_REQUEST = "catalog request status not supported"

class CatalogRequestsApi(private val client: HttpClient) {
    suspend fun list(page: Int, pageSize: Int): BaseResponse<List<GetCatalogRequestsDataItem>> =
        client.get(MerchantOperations.getCatalogRequests.path) {
            parameter(PAGE, page)
            parameter(PAGE_SIZE, pageSize)
        }.body()

    suspend fun create(body: PostCatalogRequestsBody): BaseResponse<PostCatalogRequestsData> =
        client.post(MerchantOperations.postCatalogRequests.path) { setBody(body) }.body()
}

private fun request(id: String, name: String, description: String, status: String, adminNote: String?, createdAt: String): CatalogRequest? {
    val state = CatalogRequestStatus.entries.firstOrNull { it.name == status.uppercase() } ?: return null
    return CatalogRequest(id, name, description, state, adminNote?.takeIf { it.isNotBlank() }, createdAt)
}

fun GetCatalogRequestsDataItem.toDomain() = request(id, name, description, status, adminNote, createdAt)

fun PostCatalogRequestsData.toDomain() = request(id, name, description, status, adminNote, createdAt)

class CatalogRequestsRepositoryImpl(private val api: CatalogRequestsApi) : CatalogRequestsRepository {
    override suspend fun list(page: Int): AppResult<List<CatalogRequest>> =
        safeApiCall { api.list(page, ServiceLimits.PAGE_SIZE) }.mapSuccess { response -> response.data.mapNotNull { it.toDomain() } }

    override suspend fun create(name: String, description: String, imageKey: String?): AppResult<CatalogRequest> =
        when (val result = safeApiCall { api.create(PostCatalogRequestsBody(name.trim(), description.trim(), imageKey)) }) {
            is AppResult.Success -> result.data.data.toDomain()?.let {
                AppResult.Success(it)
            } ?: AppResult.Error(AppError.UnknownError(UNREADABLE_REQUEST))
            is AppResult.Error -> result
            AppResult.Loading -> AppResult.Loading
        }
}
