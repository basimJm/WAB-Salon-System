package com.fab.wab.merchant.feature.sample.domain.usecase

import com.fab.wab.merchant.core.domain.AppResult
import com.fab.wab.merchant.feature.sample.domain.model.SampleItem
import com.fab.wab.merchant.feature.sample.domain.repository.SampleRepository
import kotlinx.coroutines.flow.Flow

class GetSampleItemsUseCase(private val repository: SampleRepository) {
    operator fun invoke(): Flow<AppResult<List<SampleItem>>> = repository.getItems()
}
