package com.fab.wab.merchant.feature.auth.domain.usecase

import com.fab.wab.merchant.core.domain.AppResult
import com.fab.wab.merchant.core.domain.session.SessionStore
import com.fab.wab.merchant.feature.auth.domain.model.InstallationLink
import com.fab.wab.merchant.feature.auth.domain.repository.AuthRepository
import com.fab.wab.merchant.feature.auth.domain.repository.InstallationInfoProvider
import com.fab.wab.merchant.feature.auth.domain.repository.InstallationsRepository
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.first

/**
 * Logout (PRD M25): tells the backend (refresh token revoked, device unlinked) and clears the session locally
 * whatever the backend answered — the member asked to leave this device.
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
