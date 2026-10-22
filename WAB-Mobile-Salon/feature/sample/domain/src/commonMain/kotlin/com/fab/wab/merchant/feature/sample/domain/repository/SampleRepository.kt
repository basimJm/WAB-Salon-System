package com.fab.wab.merchant.feature.sample.domain.repository

import com.fab.wab.merchant.core.domain.AppResult
import com.fab.wab.merchant.feature.sample.domain.model.SampleItem
import kotlinx.coroutines.flow.Flow

interface SampleRepository {
    fun getItems(): Flow<AppResult<List<SampleItem>>>
}
