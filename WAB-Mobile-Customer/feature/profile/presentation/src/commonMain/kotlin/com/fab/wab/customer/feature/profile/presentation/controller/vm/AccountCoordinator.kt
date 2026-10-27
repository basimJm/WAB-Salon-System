package com.fab.wab.customer.feature.profile.presentation.controller.vm

import com.fab.wab.customer.core.analytics.AnalyticsAction
import com.fab.wab.customer.core.analytics.analyticsParams
import com.fab.wab.customer.core.domain.AppResult
import com.fab.wab.customer.core.ui.media.ImageSource
import com.fab.wab.customer.core.ui.media.PickResult
import com.fab.wab.customer.core.ui.permission.AppPermission
import com.fab.wab.customer.core.ui.permission.PermissionOutcome
import com.fab.wab.customer.feature.profile.presentation.analytics.ProfileAnalytics
import com.fab.wab.customer.feature.profile.presentation.controller.contract.ProfileContract.SideEffect
import com.fab.wab.customer.feature.profile.presentation.controller.contract.ProfileOverlay
import com.fab.wab.customer.feature.profile.presentation.controller.contract.ProfileContract.UiState
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.launch

/** Registered-only work of S21: account header, photo (camera / gallery / delete, PRD §3.16) and account deletion. */
internal class AccountCoordinator(
    private val deps: ProfileDependencies,
    private val scope: () -> CoroutineScope,
    private val state: () -> UiState,
    private val update: (UiState.() -> UiState) -> Unit,
    private val effect: (SideEffect) -> Unit,
) {
    fun load() {
        scope().launch {
            update { copy(accountLoading = account == null, accountError = null) }
            when (val result = deps.loadProfile()) {
                is AppResult.Success -> update { copy(accountLoading = false, account = result.data) }
                is AppResult.Error -> {
                    val message = deps.errorText(result.appError)
                    update { copy(accountLoading = false, accountError = if (account == null) message else null) }
                }
                AppResult.Loading -> Unit
            }
        }
    }

    fun pickPhoto(source: ImageSource) {
        track(ProfileAnalytics.ACTION_PHOTO, source.name.lowercase())
        update { copy(overlay = null) }
        scope().launch {
            if (source == ImageSource.CAMERA && !cameraAllowed()) return@launch
            val picked = when (val result = deps.imagePicker.pick(source)) {
                is PickResult.Picked -> result.image
                else -> {
                    deps.pickText(result)?.let { effect(SideEffect.ShowError(it)) }
                    return@launch
                }
            }
            update { copy(busy = true) }
            when (val result = deps.uploadAvatar(picked.bytes, picked.contentType)) {
                is AppResult.Success -> update { copy(busy = false, account = result.data) }
                is AppResult.Error -> {
                    update { copy(busy = false) }
                    effect(SideEffect.ShowError(deps.errorText(result.appError)))
                }
                AppResult.Loading -> Unit
            }
        }
    }

    /** Denied now → say why nothing opened; denied for good → offer the settings app (PRD S21 photo from camera). */
    private suspend fun cameraAllowed(): Boolean = when (deps.permissions.ensure(AppPermission.CAMERA)) {
        PermissionOutcome.Granted -> true
        PermissionOutcome.Denied -> {
            effect(SideEffect.ShowError(deps.cameraDeniedText()))
            false
        }
        PermissionOutcome.BlockedInSettings -> {
            update { copy(overlay = ProfileOverlay.PermissionBlocked(AppPermission.CAMERA)) }
            false
        }
    }

    fun deletePhoto() {
        track(ProfileAnalytics.ACTION_PHOTO, DELETE_VALUE)
        update { copy(overlay = null, busy = true) }
        scope().launch {
            when (val result = deps.deleteAvatar()) {
                is AppResult.Success -> update { copy(busy = false, account = result.data) }
                is AppResult.Error -> {
                    update { copy(busy = false) }
                    effect(SideEffect.ShowError(deps.errorText(result.appError)))
                }
                AppResult.Loading -> Unit
            }
        }
    }

    /** PRD S21: on confirm the registered data is cleared and the device continues as Guest. */
    fun deleteAccount() {
        if (!state().signedIn) return
        track(ProfileAnalytics.ACTION_DELETE_ACCOUNT, CONFIRM_VALUE)
        update { copy(overlay = null, busy = true) }
        scope().launch {
            when (val result = deps.deleteAccount()) {
                is AppResult.Success -> {
                    update { copy(busy = false) }
                    effect(SideEffect.AccountDeleted)
                }
                is AppResult.Error -> {
                    update { copy(busy = false) }
                    effect(SideEffect.ShowError(deps.errorText(result.appError)))
                }
                AppResult.Loading -> Unit
            }
        }
    }

    private fun track(action: String, value: String) {
        deps.analytics.trackAction(AnalyticsAction(action, analyticsParams { text(ProfileAnalytics.PARAM_VALUE, value) }))
    }

    private companion object {
        const val DELETE_VALUE = "delete"
        const val CONFIRM_VALUE = "confirm"
    }
}
