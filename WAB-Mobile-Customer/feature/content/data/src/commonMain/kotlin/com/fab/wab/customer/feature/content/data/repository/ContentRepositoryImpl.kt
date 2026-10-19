package com.fab.wab.customer.feature.content.data.repository

import com.fab.wab.customer.core.domain.AppResult
import com.fab.wab.customer.core.domain.mapSuccess
import com.fab.wab.customer.core.network.safeApiCall
import com.fab.wab.customer.feature.content.data.remote.ContentApi
import com.fab.wab.customer.feature.content.domain.model.ContentPage
import com.fab.wab.customer.feature.content.domain.model.FaqItem
import com.fab.wab.customer.feature.content.domain.repository.ContentRepository

class ContentRepositoryImpl(private val api: ContentApi) : ContentRepository {
    override suspend fun page(slug: String): AppResult<ContentPage> =
        safeApiCall { api.page(slug) }.mapSuccess { ContentPage(it.data.kind, it.data.body) }

    override suspend fun faqs(): AppResult<List<FaqItem>> =
        safeApiCall { api.faqs() }.mapSuccess { response -> response.data.map { FaqItem(it.id, it.question, it.answer) } }
}
