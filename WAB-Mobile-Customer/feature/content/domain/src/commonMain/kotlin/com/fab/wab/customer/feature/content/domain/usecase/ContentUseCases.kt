package com.fab.wab.customer.feature.content.domain.usecase

import com.fab.wab.customer.core.domain.AppResult
import com.fab.wab.customer.core.domain.mapSuccess
import com.fab.wab.customer.feature.content.domain.model.FaqItem
import com.fab.wab.customer.feature.content.domain.model.RichBlock
import com.fab.wab.customer.feature.content.domain.model.RichTextParser
import com.fab.wab.customer.feature.content.domain.repository.ContentRepository

/** Loads a legal / about page and parses its body into renderable blocks. */
class LoadContentPageUseCase(private val repository: ContentRepository) {
    suspend operator fun invoke(
        slug: String,
    ): AppResult<List<RichBlock>> = repository.page(slug).mapSuccess { RichTextParser.parse(it.body) }
}

class LoadFaqsUseCase(private val repository: ContentRepository) {
    suspend operator fun invoke(): AppResult<List<FaqItem>> = repository.faqs().mapSuccess { items -> items.distinctBy { it.id } }
}
