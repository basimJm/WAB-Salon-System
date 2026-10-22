package com.fab.wab.merchant.feature.more.presentation.controller.vm

import com.fab.wab.merchant.core.analytics.AnalyticsAction
import com.fab.wab.merchant.core.analytics.AnalyticsTracker
import com.fab.wab.merchant.core.analytics.analyticsParams
import com.fab.wab.merchant.core.domain.AppearanceSettings
import com.fab.wab.merchant.core.domain.ThemeMode
import com.fab.wab.merchant.core.domain.config.AppConfigRepository
import com.fab.wab.merchant.core.domain.session.SessionState
import com.fab.wab.merchant.core.domain.session.SessionStore
import com.fab.wab.merchant.core.mvi.BaseViewModel
import com.fab.wab.merchant.core.ui.alert.RequestAlert
import com.fab.wab.merchant.core.ui.permission.OverlayPermission
import com.fab.wab.merchant.feature.auth.domain.usecase.LogoutUseCase
import com.fab.wab.merchant.feature.more.presentation.analytics.MoreAnalytics
import com.fab.wab.merchant.feature.more.presentation.controller.contract.MoreContract.SideEffect
import com.fab.wab.merchant.feature.more.presentation.controller.contract.MoreContract.UiAction
import com.fab.wab.merchant.feature.more.presentation.controller.contract.MoreContract.UiState
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.flow.launchIn
import kotlinx.coroutines.flow.onEach
import kotlinx.coroutines.launch

class MoreDependencies(
    val session: SessionStore,
    val appearance: AppearanceSettings,
    val config: AppConfigRepository,
    val overlay: OverlayPermission,
    val alert: RequestAlert,
    val logout: LogoutUseCase,
    val analytics: AnalyticsTracker,
    val version: String,
    val versionCode: Int,
)

/**
 * PRD M25 part 1: account header, language, dark mode, push toggle, Android overlay status + shortcut, alert sound
 * test, notifications inbox, Contact WAB, FAQ, legal pages, log out (confirmed), app version.
 */
class MoreViewModel(
    private val deps: MoreDependencies,
    testScope: CoroutineScope? = null,
) : BaseViewModel<UiState, UiAction, SideEffect>(initialState = UiState(version = deps.version, versionCode = deps.versionCode), testScope) {

    override fun onStart() {
        deps.session.state.onEach { session ->
            val member = (session as? SessionState.SignedIn)?.member
            updateState { copy(memberName = member?.firstName.orEmpty(), role = member?.role) }
        }.launchIn(scope)
        deps.appearance.language.onEach { language -> updateState { copy(language = language) } }.launchIn(scope)
        deps.appearance.themeMode.onEach { mode -> updateState { copy(themeMode = mode) } }.launchIn(scope)
        deps.session.pushEnabled.onEach { enabled -> updateState { copy(pushEnabled = enabled) } }.launchIn(scope)
        deps.config.current.onEach { value -> updateState { copy(contact = value?.contact) } }.launchIn(scope)
        refreshOverlay()
    }

    override fun handle(event: UiAction) {
        val contact = uiState.value.contact
        when (event) {
            UiAction.OnLanguageToggle -> scope.launch {
                val language = deps.appearance.toggleLanguage()
                track(MoreAnalytics.ACTION_LANGUAGE, language.code)
            }
            is UiAction.OnDarkMode -> scope.launch {
                deps.appearance.setThemeMode(if (event.enabled) ThemeMode.DARK else ThemeMode.LIGHT)
                track(MoreAnalytics.ACTION_THEME, event.enabled.toString())
            }
            is UiAction.OnPush -> scope.launch {
                deps.session.setPushEnabled(event.enabled)
                track(MoreAnalytics.ACTION_PUSH, event.enabled.toString())
            }
            UiAction.OnOverlay -> if (uiState.value.overlaySupported && !uiState.value.overlayGranted) {
                deps.analytics.trackAction(AnalyticsAction(MoreAnalytics.ACTION_OVERLAY))
                deps.overlay.openSettings()
            }
            UiAction.OnResume -> refreshOverlay()
            UiAction.OnSoundTest -> {
                deps.analytics.trackAction(AnalyticsAction(MoreAnalytics.ACTION_SOUND))
                deps.alert.play()
            }
            UiAction.OnNotifications -> emitSideEffect(SideEffect.OpenNotifications)
            UiAction.OnContact -> updateState { copy(contactOpen = true) }
            UiAction.OnDismissContact -> updateState { copy(contactOpen = false) }
            UiAction.OnCall -> contact?.phone?.takeIf { it.isNotBlank() }?.let { emitSideEffect(SideEffect.Dial(it)) }
            UiAction.OnWhatsApp -> contact?.whatsapp?.takeIf { it.isNotBlank() }?.let { emitSideEffect(SideEffect.WhatsApp(it)) }
            UiAction.OnEmail -> contact?.email?.takeIf { it.isNotBlank() }?.let { emitSideEffect(SideEffect.Email(it)) }
            UiAction.OnFaq -> emitSideEffect(SideEffect.OpenFaq)
            is UiAction.OnContent -> emitSideEffect(SideEffect.OpenContent(event.slug))
            UiAction.OnLogout -> updateState { copy(logoutDialog = true) }
            UiAction.OnLogoutConfirm -> logout()
            UiAction.OnDismiss -> updateState { copy(logoutDialog = false) }
        }
    }

    private fun track(name: String, value: String) = deps.analytics.trackAction(AnalyticsAction(name, analyticsParams { text(MoreAnalytics.PARAM_VALUE, value) }))

    private fun refreshOverlay() = updateState { copy(overlaySupported = deps.overlay.isSupported, overlayGranted = deps.overlay.isGranted()) }

    /** The session is cleared whatever the backend answers; the shell routes to login when the session ends. */
    private fun logout() {
        if (uiState.value.loggingOut) return
        scope.launch {
            updateState { copy(logoutDialog = false, loggingOut = true) }
            deps.analytics.trackAction(AnalyticsAction(MoreAnalytics.ACTION_LOGOUT))
            deps.logout()
            updateState { copy(loggingOut = false) }
        }
    }
}
