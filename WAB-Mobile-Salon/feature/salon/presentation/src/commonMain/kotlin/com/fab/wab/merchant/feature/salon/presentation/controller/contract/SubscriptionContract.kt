package com.fab.wab.merchant.feature.salon.presentation.controller.contract

import com.fab.wab.merchant.core.domain.config.ContactInfo
import com.fab.wab.merchant.feature.salon.domain.Subscription

/** Why the contact sheet is open (the featured request adds its note). */
enum class ContactReason { SUBSCRIPTION, FEATURED }

sealed interface SubscriptionContract {
    data class UiState(
        val loading: Boolean = true,
        val refreshing: Boolean = false,
        val error: String? = null,
        val subscription: Subscription? = null,
        val contact: ContactInfo? = null,
        val contactSheet: ContactReason? = null,
    )

    sealed interface UiAction {
        data class OnContact(val reason: ContactReason) : UiAction
        data object OnDismissContact : UiAction
        data object OnCall : UiAction
        data object OnWhatsApp : UiAction
        data object OnEmail : UiAction
        data object OnRefresh : UiAction
        data object OnRetry : UiAction
    }

    sealed interface SideEffect {
        data class Dial(val phone: String) : SideEffect
        data class WhatsApp(val phone: String) : SideEffect
        data class Email(val address: String) : SideEffect
        data class ShowError(val message: String) : SideEffect
    }
}
