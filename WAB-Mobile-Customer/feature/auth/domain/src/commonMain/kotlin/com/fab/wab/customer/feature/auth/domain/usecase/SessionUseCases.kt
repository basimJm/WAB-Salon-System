package com.fab.wab.customer.feature.auth.domain.usecase

import com.fab.wab.customer.core.domain.AppResult
import com.fab.wab.customer.core.domain.session.SessionStore
import com.fab.wab.customer.feature.auth.domain.model.InstallationLink
import com.fab.wab.customer.feature.auth.domain.repository.AuthRepository
import com.fab.wab.customer.feature.auth.domain.repository.InstallationInfoProvider
import com.fab.wab.customer.feature.auth.domain.repository.InstallationsRepository
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.first

/**
 * Logout (PRD §4.3, §10.2): tells the backend (refresh token revoked, device unlinked) and clears the registered
 * data locally whatever the backend answered — the user asked to leave this device.
 */
class LogoutUseCase(
    private val repository: AuthRepository,
    private val sessionStore: SessionStore,
) {
    suspend operator fun invoke(): AppResult<Unit> {
        val refresh = sessionStore.tokens()?.refreshToken
        val result = if (refresh.isNullOrBlank()) AppResult.Success(Unit) else repository.logout(refresh)
        sessionStore.signOut()
        return result
    }
}

/** `PUT /installations` with the current device facts and language; null when Firebase has no instance id yet. */
class SyncInstallationUseCase(
    private val installations: InstallationsRepository,
    private val installationInfo: InstallationInfoProvider,
    private val language: Flow<String>,
) {
    suspend operator fun invoke(): AppResult<InstallationLink>? {
        val info = installationInfo.current() ?: return null
        return installations.register(info, language.first())
    }
}

/** Push switch (PRD §5 `push_enabled`): stored locally, and synced to the account when signed in. */
class SetPushEnabledUseCase(
    private val installations: InstallationsRepository,
    private val sessionStore: SessionStore,
) {
    suspend operator fun invoke(enabled: Boolean): AppResult<Unit> {
        sessionStore.setPushEnabled(enabled)
        val signedIn = sessionStore.state.first().isSignedIn
        return if (signedIn) installations.setPushEnabled(enabled) else AppResult.Success(Unit)
    }
}
