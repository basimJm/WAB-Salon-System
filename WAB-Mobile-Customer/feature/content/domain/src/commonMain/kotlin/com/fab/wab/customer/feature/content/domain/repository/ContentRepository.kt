package com.fab.wab.customer.feature.content.domain.repository

import com.fab.wab.customer.core.domain.AppResult
import com.fab.wab.customer.feature.content.domain.model.ContentPage
import com.fab.wab.customer.feature.content.domain.model.FaqItem

interface ContentRepository {
    suspend fun page(slug: String): AppResult<ContentPage>
    suspend fun faqs(): AppResult<List<FaqItem>>
}
