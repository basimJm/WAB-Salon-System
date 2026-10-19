package com.fab.wab.customer.feature.profile.presentation.controller.vm

import com.fab.wab.customer.core.analytics.AnalyticsAction
import com.fab.wab.customer.core.analytics.analyticsParams
import com.fab.wab.customer.core.common.DeepLinks
import com.fab.wab.customer.core.domain.AppLanguage
import com.fab.wab.customer.core.domain.AppResult
import com.fab.wab.customer.core.domain.ThemeMode
import com.fab.wab.customer.core.domain.session.Gender
import com.fab.wab.customer.core.domain.session.SessionState
import com.fab.wab.customer.core.mvi.BaseViewModel
import com.fab.wab.customer.core.ui.permission.AppPermission
import com.fab.wab.customer.feature.profile.domain.model.ProfileDefaults
import com.fab.wab.customer.feature.profile.presentation.analytics.ProfileAnalytics
import com.fab.wab.customer.feature.profile.presentation.controller.contract.ContactChannel
import com.fab.wab.customer.feature.profile.presentation.controller.contract.ProfileContract.SideEffect
import com.fab.wab.customer.feature.profile.presentation.controller.contract.ProfileContract.UiAction
import com.fab.wab.customer.feature.profile.presentation.controller.contract.ProfileContract.UiState
import com.fab.wab.customer.feature.profile.presentation.controller.contract.ProfileLink
import com.fab.wab.customer.feature.profile.presentation.controller.contract.ProfileOverlay
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.launch

/** S21: guest / registered layouts from the session; settings, support, legal, session actions. Photo + account = [AccountCoordinator]. */
class ProfileViewModel(
    private val deps: ProfileDependencies,
    testScope: CoroutineScope? = null,
) : BaseViewModel<UiState, UiAction, SideEffect>(initialState = UiState(appVersion = deps.environment.appVersion), testScope) {

    private var started = false
    private val account = AccountCoordinator(deps, { scope }, { uiState.value }, ::updateState, ::emitSideEffect)

    override fun onStart() {
        if (started) return
        started = true
        scope.launch { deps.sessionStore.state.collect(::applySession) }
        scope.launch { deps.appearance.language.collect { updateState { copy(language = it) } } }
        scope.launch { deps.appearance.themeMode.collect { updateState { copy(themeMode = it) } } }
        scope.launch { deps.sessionStore.pushEnabled.collect { updateState { copy(pushEnabled = it) } } }
        scope.launch { deps.config.current.collect { updateState { copy(contact = it?.contact) } } }
    }

    override fun handle(event: UiAction) {
        if (!handleGuestAndPhoto(event) && !handleSettingsAndSupport(event)) handleSession(event)
    }

    private fun handleGuestAndPhoto(event: UiAction): Boolean {
        when (event) {
            UiAction.OnResume -> if (uiState.value.signedIn) account.load()
            UiAction.OnRetryAccount -> account.load()
            UiAction.OnEditGuestClick -> openEditGuest()
            is UiAction.OnGuestNicknameChange -> editGuest { copy(nickname = event.value.take(ProfileDefaults.MAX_NICKNAME_LENGTH)) }
            is UiAction.OnGuestGenderSelect -> editGuest { copy(gender = event.gender) }
            UiAction.OnGuestSave -> saveGuest()
            UiAction.OnPhotoClick -> updateState { copy(overlay = ProfileOverlay.PhotoOptions) }
            is UiAction.OnPhotoSourceSelect -> account.pickPhoto(event.source)
            UiAction.OnPhotoDelete -> account.deletePhoto()
            else -> return false
        }
        return true
    }

    private fun handleSettingsAndSupport(event: UiAction): Boolean {
        when (event) {
            UiAction.OnLanguageClick -> updateState { copy(overlay = ProfileOverlay.LanguagePicker) }
            is UiAction.OnLanguageSelect -> selectLanguage(event.language)
            UiAction.OnThemeClick -> updateState { copy(overlay = ProfileOverlay.ThemePicker) }
            is UiAction.OnThemeSelect -> selectTheme(event.mode)
            is UiAction.OnPushToggle -> togglePush(event.enabled)
            UiAction.OnContactClick -> updateState { copy(overlay = ProfileOverlay.ContactUs) }
            is UiAction.OnContactChannel -> contact(event.channel)
            is UiAction.OnLinkClick -> openLink(event.link)
            else -> return false
        }
        return true
    }

    private fun handleSession(event: UiAction) {
        when (event) {
            UiAction.OnLoginClick -> emitSideEffect(SideEffect.OpenLogin)
            UiAction.OnLogoutClick -> updateState { copy(overlay = ProfileOverlay.LogoutConfirm) }
            UiAction.OnLogoutConfirm -> logout()
            UiAction.OnDeleteAccountClick -> updateState { copy(overlay = ProfileOverlay.DeleteAccountConfirm) }
            UiAction.OnDeleteAccountConfirm -> account.deleteAccount()
            UiAction.OnOverlayDismiss -> updateState { copy(overlay = null) }
            else -> Unit
        }
    }

    private fun applySession(session: SessionState) {
        val wasSignedIn = uiState.value.signedIn
        when (session) {
            is SessionState.Guest -> updateState {
                copy(
                    signedIn = false,
                    guestNickname = session.profile.nickname.orEmpty(),
                    guestGender = session.profile.gender,
                    account = null,
                )
            }
            is SessionState.SignedIn -> updateState { copy(
                signedIn = true,
                guestNickname = session.user.firstName,
                guestGender = session.user.gender,
            ) }
        }
        if (session.isSignedIn && !wasSignedIn) account.load()
    }

    private fun openEditGuest() {
        val s = uiState.value
        updateState { copy(overlay = ProfileOverlay.EditGuest(s.guestNickname, s.guestGender)) }
    }

    private fun editGuest(transform: ProfileOverlay.EditGuest.() -> ProfileOverlay.EditGuest) =
        updateState { copy(overlay = (overlay as? ProfileOverlay.EditGuest)?.transform() ?: overlay) }

    private fun saveGuest() {
        val draft = uiState.value.overlay as? ProfileOverlay.EditGuest ?: return
        val gender: Gender = draft.gender ?: return
        if (!draft.canSave) return
        track(ProfileAnalytics.ACTION_EDIT_GUEST)
        scope.launch {
            deps.updateGuest(draft.nickname, gender)
            updateState { copy(overlay = null) }
        }
    }

    private fun selectLanguage(language: AppLanguage) {
        track(ProfileAnalytics.ACTION_LANGUAGE, ProfileAnalytics.PARAM_VALUE to language.code)
        updateState { copy(overlay = null) }
        scope.launch { deps.appearance.setLanguage(language) }
    }

    private fun selectTheme(mode: ThemeMode) {
        track(ProfileAnalytics.ACTION_THEME, ProfileAnalytics.PARAM_VALUE to mode.name.lowercase())
        updateState { copy(overlay = null) }
        scope.launch { deps.appearance.setThemeMode(mode) }
    }

    private fun togglePush(enabled: Boolean) {
        track(ProfileAnalytics.ACTION_PUSH, ProfileAnalytics.PARAM_VALUE to enabled.toString())
        updateState { copy(pushEnabled = enabled) }
        scope.launch {
            // PRD §10.2: delivery also needs the OS permission; a refusal keeps the preference (settings can grant it later).
            if (enabled) deps.permissions.ensure(AppPermission.NOTIFICATIONS)
            val result = deps.setPushEnabled(enabled)
            if (result is AppResult.Error) emitSideEffect(SideEffect.ShowError(deps.errorText(result.appError)))
        }
    }

    private fun contact(channel: ContactChannel) {
        val info = uiState.value.contact ?: return
        track(ProfileAnalytics.ACTION_CONTACT, ProfileAnalytics.PARAM_VALUE to channel.name.lowercase())
        updateState { copy(overlay = null) }
        when (channel) {
            ContactChannel.CALL -> deps.external.dial(info.phone)
            ContactChannel.WHATSAPP -> deps.external.openWhatsApp(info.whatsapp)
            ContactChannel.EMAIL -> deps.external.email(info.email)
        }
    }

    private fun openLink(link: ProfileLink) {
        track(ProfileAnalytics.ACTION_OPEN, ProfileAnalytics.PARAM_VALUE to link.name.lowercase())
        val storeUrl = deps.config.current.value?.update?.storeUrl
        when (link) {
            ProfileLink.PERSONAL_INFO -> emitSideEffect(SideEffect.OpenPersonalInfo)
            ProfileLink.FAQ -> emitSideEffect(SideEffect.OpenFaq)
            ProfileLink.RATE_APP -> storeUrl?.let(deps.external::openUrl)
            ProfileLink.SHARE_APP -> storeUrl?.let(deps.external::share)
            ProfileLink.REGISTER_SALON -> openMerchantRegistration()
            ProfileLink.PRIVACY -> emitSideEffect(SideEffect.OpenContent(ContentSlugs.PRIVACY))
            ProfileLink.TERMS -> emitSideEffect(SideEffect.OpenContent(ContentSlugs.TERMS))
            ProfileLink.ABOUT -> emitSideEffect(SideEffect.OpenContent(ContentSlugs.ABOUT))
        }
    }

    /** PRD S21 / Merchant PRD §4.5: the merchant app if installed, else its store page; the website until those are configured. */
    private fun openMerchantRegistration() {
        val merchant = deps.environment.merchant
        if (merchant.isConfigured) {
            deps.external.openApp(merchant.registerUrl, merchant.appId, merchant.storeUrl)
        } else {
            deps.external.openUrl(DeepLinks.merchantRegistration(deps.environment.webBaseUrl))
        }
    }

    private fun logout() {
        track(ProfileAnalytics.ACTION_LOGOUT)
        updateState { copy(overlay = null, busy = true) }
        scope.launch {
            deps.logout()
            updateState { copy(busy = false) }
            emitSideEffect(SideEffect.LoggedOut)
        }
    }

    private fun track(action: String, vararg params: Pair<String, String>) {
        deps.analytics.trackAction(AnalyticsAction(action, analyticsParams { params.forEach { (k, v) -> text(k, v) } }))
    }
}

/** `GET /content/pages/{slug}` kinds (S23). */
object ContentSlugs {
    const val PRIVACY = "privacy"
    const val TERMS = "terms"
    const val ABOUT = "about"
}
