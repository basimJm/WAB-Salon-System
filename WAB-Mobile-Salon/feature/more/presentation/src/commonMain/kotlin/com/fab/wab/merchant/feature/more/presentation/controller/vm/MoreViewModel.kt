package com.fab.wab.merchant.feature.more.presentation.controller.vm

import com.fab.wab.merchant.core.analytics.AnalyticsAction
import com.fab.wab.merchant.core.analytics.AnalyticsTracker
import com.fab.wab.merchant.core.analytics.analyticsParams
import com.fab.wab.merchant.core.domain.AppError
import com.fab.wab.merchant.core.domain.AppResult
import com.fab.wab.merchant.core.domain.AppearanceSettings
import com.fab.wab.merchant.core.domain.ThemeMode
import com.fab.wab.merchant.core.domain.config.AppConfigRepository
import com.fab.wab.merchant.core.domain.session.SessionState
import com.fab.wab.merchant.core.domain.session.SessionStore
import com.fab.wab.merchant.core.mvi.BaseViewModel
import com.fab.wab.merchant.core.ui.alert.RequestAlert
import com.fab.wab.merchant.core.ui.permission.OverlayPermission
import com.fab.wab.merchant.designsystem.components.feedback.appErrorText
import com.fab.wab.merchant.feature.auth.domain.usecase.LogoutUseCase
import com.fab.wab.merchant.feature.more.domain.AccountLimits
import com.fab.wab.merchant.feature.more.domain.AccountRepository
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
    /** Shown at the bottom of More (empty until the shell passes the build's version). */
    val version: String = "",
    val versionCode: Int = 0,
    /** MER-049: `/me` (photo, push switch), `PATCH /installations/push-enabled`, leave / salon deletion request. */
    val account: AccountRepository,
    val errorText: suspend (AppError) -> String = ::appErrorText,
)

/**
 * PRD M25 part 1: account header, language, dark mode, push toggle, Android overlay status + shortcut, alert sound
 * test, notifications inbox, Contact WAB, FAQ, legal pages, log out (confirmed), app version.
 */
class MoreViewModel(
    private val deps: MoreDependencies,
    testScope: CoroutineScope? = null,
) : BaseViewModel<UiState, UiAction, SideEffect>(
    initialState = UiState(version = deps.version, versionCode = deps.versionCode),
    testScope,
) {

    /** Set when the member opened the overlay settings; the next resume reports the result. */
    private var overlayAsked = false

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
        loadAccount()
    }

    /** Silent: the photo for the header and the server's push switch (kept locally for the app's own checks). */
    private fun loadAccount() {
        scope.launch {
            val account = (deps.account.me() as? AppResult.Success)?.data ?: return@launch
            updateState { copy(photoUrl = account.photoUrl) }
            if (account.pushEnabled != uiState.value.pushEnabled) deps.session.setPushEnabled(account.pushEnabled)
        }
    }

    override fun handle(event: UiAction) {
        handleSettings(event) || handleSupport(event) || handleLogout(event) || handleAccount(event)
    }

    private fun handleSettings(event: UiAction): Boolean {
        when (event) {
            UiAction.OnLanguageToggle -> scope.launch {
                val language = deps.appearance.toggleLanguage()
                track(MoreAnalytics.ACTION_LANGUAGE, language.code)
            }
            is UiAction.OnDarkMode -> scope.launch {
                deps.appearance.setThemeMode(if (event.enabled) ThemeMode.DARK else ThemeMode.LIGHT)
                track(MoreAnalytics.ACTION_THEME, event.enabled.toString())
            }
            is UiAction.OnPush -> setPush(event.enabled)
            UiAction.OnOverlay -> if (uiState.value.overlaySupported && !uiState.value.overlayGranted) {
                deps.analytics.trackAction(AnalyticsAction(MoreAnalytics.ACTION_OVERLAY))
                overlayAsked = true
                deps.overlay.openSettings()
            }
            UiAction.OnResume -> {
                refreshOverlay()
                reportOverlayResult()
            }
            UiAction.OnSoundTest -> {
                deps.analytics.trackAction(AnalyticsAction(MoreAnalytics.ACTION_SOUND))
                deps.alert.play()
            }
            else -> return false
        }
        return true
    }

    private fun handleSupport(event: UiAction): Boolean {
        val contact = uiState.value.contact
        when (event) {
            UiAction.OnNotifications -> emitSideEffect(SideEffect.OpenNotifications)
            UiAction.OnContact -> updateState { copy(contactOpen = true) }
            UiAction.OnDismissContact -> updateState { copy(contactOpen = false) }
            UiAction.OnCall -> contact?.phone?.takeIf { it.isNotBlank() }?.let { emitSideEffect(SideEffect.Dial(it)) }
            UiAction.OnWhatsApp -> contact?.whatsapp?.takeIf { it.isNotBlank() }?.let { emitSideEffect(SideEffect.WhatsApp(it)) }
            UiAction.OnEmail -> contact?.email?.takeIf { it.isNotBlank() }?.let { emitSideEffect(SideEffect.Email(it)) }
            UiAction.OnFaq -> emitSideEffect(SideEffect.OpenFaq)
            is UiAction.OnContent -> emitSideEffect(SideEffect.OpenContent(event.slug))
            else -> return false
        }
        return true
    }

    private fun handleLogout(event: UiAction): Boolean {
        when (event) {
            UiAction.OnLogout -> updateState { copy(logoutDialog = true) }
            UiAction.OnLogoutConfirm -> logout()
            UiAction.OnDismiss -> updateState { copy(logoutDialog = false) }
            else -> return false
        }
        return true
    }

    private fun handleAccount(event: UiAction): Boolean {
        when (event) {
            UiAction.OnAccount -> emitSideEffect(SideEffect.OpenAccount)
            UiAction.OnDeleteAccount -> updateState { copy(deleteSheet = true, deletionNote = "", deletionRequestedAt = null) }
            is UiAction.OnDeletionNote -> updateState { copy(deletionNote = event.value.take(AccountLimits.DELETION_NOTE_MAX)) }
            UiAction.OnDeleteConfirm -> deleteAccount()
            UiAction.OnDeleteDismiss -> if (!uiState.value.deleting) updateState { copy(deleteSheet = false) }
            else -> return false
        }
        return true
    }

    /** Optimistic switch; the server's answer wins (a failure puts the old value back). */
    private fun setPush(enabled: Boolean) {
        val before = uiState.value.pushEnabled
        scope.launch {
            deps.session.setPushEnabled(enabled)
            track(MoreAnalytics.ACTION_PUSH, enabled.toString())
            val result = deps.account.setPushEnabled(enabled)
            if (result is AppResult.Error) {
                deps.session.setPushEnabled(before)
                emitSideEffect(SideEffect.ShowError(deps.errorText(result.appError)))
            }
        }
    }

    /** PRD M25 delete my account: the owner sends a salon deletion request; other members leave and are signed out. */
    private fun deleteAccount() {
        val state = uiState.value
        if (state.deleting) return
        scope.launch {
            updateState { copy(deleting = true) }
            val kind = if (state.isOwner) MoreAnalytics.KIND_SALON else MoreAnalytics.KIND_LEAVE
            deps.analytics.trackAction(
                AnalyticsAction(MoreAnalytics.ACTION_DELETE_REQUEST, analyticsParams { text(MoreAnalytics.PARAM_KIND, kind) }),
            )
            if (state.isOwner) {
                when (val result = deps.account.requestSalonDeletion(state.deletionNote)) {
                    is AppResult.Success -> updateState { copy(deleting = false, deletionRequestedAt = result.data) }
                    is AppResult.Error -> failDeletion(result.appError)
                    AppResult.Loading -> Unit
                }
            } else {
                when (val result = deps.account.leave()) {
                    is AppResult.Success -> {
                        updateState { copy(deleting = false, deleteSheet = false) }
                        deps.session.clearAll()
                    }
                    is AppResult.Error -> failDeletion(result.appError)
                    AppResult.Loading -> Unit
                }
            }
        }
    }

    private suspend fun failDeletion(error: AppError) {
        updateState { copy(deleting = false) }
        emitSideEffect(SideEffect.ShowError(deps.errorText(error)))
    }

    private fun track(
        name: String,
        value: String,
    ) = deps.analytics.trackAction(AnalyticsAction(name, analyticsParams { text(MoreAnalytics.PARAM_VALUE, value) }))

    /** PRD §14 `overlay_permission_result`: once, when the member comes back from the system screen. */
    private fun reportOverlayResult() {
        if (!overlayAsked) return
        overlayAsked = false
        val granted = uiState.value.overlayGranted
        deps.analytics.trackAction(
            AnalyticsAction(MoreAnalytics.ACTION_OVERLAY_RESULT, analyticsParams { flag(MoreAnalytics.PARAM_GRANTED, granted) }),
        )
    }

    private fun refreshOverlay() = updateState {
        copy(overlaySupported = deps.overlay.isSupported, overlayGranted = deps.overlay.isGranted())
    }

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
