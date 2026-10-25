package com.fab.wab.merchant.feature.more.presentation.controller.contract

import com.fab.wab.merchant.core.domain.AppLanguage
import com.fab.wab.merchant.core.domain.ThemeMode
import com.fab.wab.merchant.core.domain.config.ContactInfo
import com.fab.wab.merchant.core.domain.session.MemberRole

sealed interface MoreContract {
    data class UiState(
        val memberName: String = "",
        val role: MemberRole? = null,
        val language: AppLanguage = AppLanguage.DEFAULT,
        val themeMode: ThemeMode = ThemeMode.SYSTEM,
        val pushEnabled: Boolean = true,
        val overlaySupported: Boolean = false,
        val overlayGranted: Boolean = false,
        val contact: ContactInfo? = null,
        val contactOpen: Boolean = false,
        val logoutDialog: Boolean = false,
        val loggingOut: Boolean = false,
        val version: String = "",
        val versionCode: Int = 0,
    )

    sealed interface UiAction {
        data object OnLanguageToggle : UiAction
        data class OnDarkMode(val enabled: Boolean) : UiAction
        data class OnPush(val enabled: Boolean) : UiAction
        data object OnOverlay : UiAction
        data object OnResume : UiAction
        data object OnSoundTest : UiAction
        data object OnNotifications : UiAction
        data object OnContact : UiAction
        data object OnDismissContact : UiAction
        data object OnCall : UiAction
        data object OnWhatsApp : UiAction
        data object OnEmail : UiAction
        data object OnFaq : UiAction
        data class OnContent(val slug: String) : UiAction
        data object OnLogout : UiAction
        data object OnLogoutConfirm : UiAction
        data object OnDismiss : UiAction
    }

    sealed interface SideEffect {
        data object OpenFaq : SideEffect
        data class OpenContent(val slug: String) : SideEffect
        data object OpenNotifications : SideEffect
        data class Dial(val phone: String) : SideEffect
        data class WhatsApp(val phone: String) : SideEffect
        data class Email(val address: String) : SideEffect
    }
}
