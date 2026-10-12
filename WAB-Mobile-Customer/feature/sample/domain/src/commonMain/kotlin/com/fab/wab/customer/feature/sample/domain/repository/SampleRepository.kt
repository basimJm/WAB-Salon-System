package com.fab.wab.customer.feature.sample.domain.repository

import com.fab.wab.customer.core.domain.AppResult
import com.fab.wab.customer.feature.sample.domain.model.SampleItem
import kotlinx.coroutines.flow.Flow

interface SampleRepository {
    fun getItems(): Flow<AppResult<List<SampleItem>>>
}
