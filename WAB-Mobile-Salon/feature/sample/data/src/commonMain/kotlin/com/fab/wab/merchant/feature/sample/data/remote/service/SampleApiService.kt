package com.fab.wab.merchant.feature.sample.data.remote.service

import com.fab.wab.merchant.core.data.BaseResponse
import com.fab.wab.merchant.feature.sample.data.remote.dto.SampleItemDto

interface SampleApiService {
    suspend fun getItems(): BaseResponse<List<SampleItemDto>>
}
