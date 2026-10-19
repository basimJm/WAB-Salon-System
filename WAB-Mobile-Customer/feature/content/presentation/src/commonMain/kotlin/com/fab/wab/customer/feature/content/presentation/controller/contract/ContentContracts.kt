package com.fab.wab.customer.feature.content.presentation.controller.contract

import com.fab.wab.customer.core.domain.config.ContactInfo
import com.fab.wab.customer.feature.content.domain.model.FaqItem
import com.fab.wab.customer.feature.content.domain.model.RichBlock

enum class ContactChannel { CALL, WHATSAPP, EMAIL }

/** S23 page: rich text from the server, or the contact actions when the slug is `contact`. */
sealed interface ContentPageContract {
    data class UiState(
        val slug: String = "",
        val loading: Boolean = true,
        val offline: Boolean = false,
        val error: String? = null,
        val blocks: List<RichBlock> = emptyList(),
        val contact: ContactInfo? = null,
        val isContact: Boolean = false,
    )

    sealed interface UiAction {
        data object OnRetry : UiAction
        data class OnLinkClick(val url: String) : UiAction
        data class OnContactChannel(val channel: ContactChannel) : UiAction
    }

    sealed interface SideEffect {
        data class ShowError(val message: String) : SideEffect
    }
}

/** S23 FAQ: expandable questions. */
sealed interface FaqContract {
    data class UiState(
        val loading: Boolean = true,
        val offline: Boolean = false,
        val error: String? = null,
        val items: List<FaqItem> = emptyList(),
        val expanded: Set<String> = emptySet(),
    ) {
        val loaded: Boolean get() = !loading && error == null
    }

    sealed interface UiAction {
        data object OnRetry : UiAction
        data class OnToggle(val id: String) : UiAction
    }
}
