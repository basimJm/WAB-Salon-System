package com.fab.wab.customer.core.data.remote

import com.fab.wab.customer.core.data.BaseResponse
import com.fab.wab.customer.core.data.dto.ApplicationSettingsDto

interface AppSettingsApiService {
    suspend fun getSettings(): BaseResponse<ApplicationSettingsDto>
}
