package com.fab.wab.customer.core.data.remote

import com.fab.wab.customer.core.data.BaseResponse
import com.fab.wab.customer.core.data.dto.ApplicationSettingsDto
import io.ktor.client.HttpClient
import io.ktor.client.call.body
import io.ktor.client.request.get

class AppSettingsApiServiceImpl(private val httpClient: HttpClient) : AppSettingsApiService {
    override suspend fun getSettings(): BaseResponse<ApplicationSettingsDto> {
        return httpClient.get("/api/user/application-settings").body()
    }
}