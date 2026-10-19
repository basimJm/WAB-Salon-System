package com.fab.wab.customer.feature.profile.presentation.controller.contract

import com.fab.wab.customer.core.domain.AppLanguage
import com.fab.wab.customer.core.domain.ThemeMode
import com.fab.wab.customer.core.domain.config.ContactInfo
import com.fab.wab.customer.core.domain.session.Gender
import com.fab.wab.customer.core.ui.media.ImageSource
import com.fab.wab.customer.feature.profile.domain.model.CustomerAccount

/** S21 rows that open another screen or an external app. */
enum class ProfileLink { PERSONAL_INFO, FAQ, RATE_APP, SHARE_APP, REGISTER_SALON, PRIVACY, TERMS, ABOUT }

enum class ContactChannel { CALL, WHATSAPP, EMAIL }

/** One sheet / dialog at a time (Design Script S21 frames). */
sealed interface ProfileOverlay {
    data class EditGuest(val nickname: String, val gender: Gender?) : ProfileOverlay {
        val canSave: Boolean get() = nickname.isNotBlank() && gender != null
    }
    data object PhotoOptions : ProfileOverlay
    data object LanguagePicker : ProfileOverlay
    data object ThemePicker : ProfileOverlay
    data object ContactUs : ProfileOverlay
    data object LogoutConfirm : ProfileOverlay
    data object DeleteAccountConfirm : ProfileOverlay
}

sealed interface ProfileContract {

    data class UiState(
        val signedIn: Boolean = false,
        val guestNickname: String = "",
        val guestGender: Gender? = null,
        val account: CustomerAccount? = null,
        val accountLoading: Boolean = false,
        val accountError: String? = null,
        val language: AppLanguage = AppLanguage.ARABIC,
        val themeMode: ThemeMode = ThemeMode.SYSTEM,
        val pushEnabled: Boolean = true,
        val contact: ContactInfo? = null,
        val appVersion: String = "",
        val overlay: ProfileOverlay? = null,
        val busy: Boolean = false,
    ) {
        val hasPhoto: Boolean get() = account?.avatarUrl != null
    }

    sealed interface UiAction {
        data object OnResume : UiAction
        data object OnRetryAccount : UiAction
        data object OnEditGuestClick : UiAction
        data class OnGuestNicknameChange(val value: String) : UiAction
        data class OnGuestGenderSelect(val gender: Gender) : UiAction
        data object OnGuestSave : UiAction
        data object OnPhotoClick : UiAction
        data class OnPhotoSourceSelect(val source: ImageSource) : UiAction
        data object OnPhotoDelete : UiAction
        data object OnLanguageClick : UiAction
        data class OnLanguageSelect(val language: AppLanguage) : UiAction
        data object OnThemeClick : UiAction
        data class OnThemeSelect(val mode: ThemeMode) : UiAction
        data class OnPushToggle(val enabled: Boolean) : UiAction
        data object OnContactClick : UiAction
        data class OnContactChannel(val channel: ContactChannel) : UiAction
        data class OnLinkClick(val link: ProfileLink) : UiAction
        data object OnLoginClick : UiAction
        data object OnLogoutClick : UiAction
        data object OnLogoutConfirm : UiAction
        data object OnDeleteAccountClick : UiAction
        data object OnDeleteAccountConfirm : UiAction
        data object OnOverlayDismiss : UiAction
    }

    sealed interface SideEffect {
        data object OpenLogin : SideEffect
        data object OpenPersonalInfo : SideEffect
        data object OpenFaq : SideEffect
        data class OpenContent(val slug: String) : SideEffect
        data object LoggedOut : SideEffect
        data object AccountDeleted : SideEffect
        data class ShowError(val message: String) : SideEffect
    }
}
