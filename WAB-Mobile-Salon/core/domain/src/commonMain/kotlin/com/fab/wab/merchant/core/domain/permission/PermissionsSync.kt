package com.fab.wab.merchant.core.domain.permission

import com.fab.wab.merchant.core.domain.auth.SessionRefresher
import com.fab.wab.merchant.core.domain.auth.TokenRefreshResult
import com.fab.wab.merchant.core.domain.session.SessionStore
import kotlinx.coroutines.flow.first

/** What a permission re-fetch did. */
sealed interface PermissionsRefresh {
    data class Updated(val permissions: PermissionSet) : PermissionsRefresh

    /** Guest, or the server could not be reached: the cached permissions stay. */
    data object Unchanged : PermissionsRefresh

    /** The server refused the session (member deactivated / access revoked): signed out. */
    data object SignedOut : PermissionsRefresh
}

/**
 * Re-fetches the member's permissions (PRD §3: app start, Home pull-to-refresh, `PERMISSIONS_UPDATED` push / socket
 * `permissions.updated`). Only the refresh call returns the member, so it rotates the tokens through the shared
 * single-flight [SessionRefresher] and stores the member, role and permission keys it brings back.
 */
class PermissionsSync(
    private val refresher: SessionRefresher,
    private val sessionStore: SessionStore,
) {
    suspend fun refresh(): PermissionsRefresh {
        if (!sessionStore.state.first().isSignedIn) return PermissionsRefresh.Unchanged
        return when (val result = refresher.refreshNow()) {
            is TokenRefreshResult.Refreshed -> {
                result.member?.let { sessionStore.updateMember(it) }
                result.permissions?.let { sessionStore.updatePermissions(it) }
                PermissionsRefresh.Updated(sessionStore.state.first().permissionSet())
            }
            TokenRefreshResult.Rejected -> {
                sessionStore.signOut()
                PermissionsRefresh.SignedOut
            }
            TokenRefreshResult.Unavailable -> PermissionsRefresh.Unchanged
        }
    }
}
