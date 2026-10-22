package com.fab.wab.merchant.feature.sample.data.remote.service

import com.fab.wab.merchant.core.data.BaseResponse
import com.fab.wab.merchant.feature.sample.data.remote.dto.SampleItemDto
import com.fab.wab.merchant.feature.sample.data.utils.SampleEndPoints
import io.ktor.client.HttpClient
import io.ktor.client.call.body
import io.ktor.client.request.get

class SampleApiServiceImpl(private val httpClient: HttpClient) : SampleApiService {

    override suspend fun getItems(): BaseResponse<List<SampleItemDto>> =
        httpClient.get(SampleEndPoints.ITEMS).body()
}
