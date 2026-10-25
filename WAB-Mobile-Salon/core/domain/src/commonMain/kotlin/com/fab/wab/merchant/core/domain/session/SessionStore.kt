package com.fab.wab.merchant.core.domain.session

import com.fab.wab.merchant.core.domain.auth.AuthTokens
import kotlinx.coroutines.flow.Flow

/**
 * The one local store for the PRD §5 session keys: tokens, member and salon identity, role, cached permissions and
 * salon state, the push toggle and the Android overlay prompt flag. Tokens live in encrypted platform storage
 * (Keystore / Keychain), are read on demand, never exposed as a flow and never logged. Language and theme live in
 * `AppSettings`.
 */
interface SessionStore {
    val state: Flow<SessionState>
    val pushEnabled: Flow<Boolean>

    /** PRD §5 `overlay_permission_prompted`: the "display over other apps" explanation was shown once. */
    val overlayPermissionPrompted: Flow<Boolean>

    suspend fun tokens(): AuthTokens?

    /** Login completed: stores the pair, the member and what the server returned about the salon. */
    suspend fun signIn(tokens: AuthTokens, member: MemberProfile, permissions: Set<String>, salonState: SalonState?)

    /** Rotation after a refresh; the state does not change. */
    suspend fun updateTokens(tokens: AuthTokens)

    suspend fun updateMember(member: MemberProfile)

    /** Fresh permission keys (app start, Home refresh, `PERMISSIONS_UPDATED` push). */
    suspend fun updatePermissions(permissions: Set<String>)

    suspend fun updateSalonState(salonState: SalonState?)

    suspend fun setPushEnabled(enabled: Boolean)

    suspend fun setOverlayPermissionPrompted(prompted: Boolean)

    /** Logout, an expired session or a deactivated member: drops tokens and identity; push and overlay flags stay. */
    suspend fun signOut()

    /** Account deletion: everything the store holds. */
    suspend fun clearAll()
}
