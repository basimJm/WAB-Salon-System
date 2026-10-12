package com.fab.wab.customer.feature.sample.data.remote.service

import com.fab.wab.customer.core.data.BaseResponse
import com.fab.wab.customer.feature.sample.data.remote.dto.SampleItemDto

interface SampleApiService {
    suspend fun getItems(): BaseResponse<List<SampleItemDto>>
}
