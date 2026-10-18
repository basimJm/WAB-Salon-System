package com.fab.wab.customer.core.domain.session

import com.fab.wab.customer.core.domain.auth.AuthTokens
import kotlinx.coroutines.flow.Flow

/**
 * The one local store for the PRD §5 session keys: onboarding flag, guest identity, auth tokens, registered
 * user facts and the push toggle. Tokens live in encrypted platform storage (Keystore / Keychain) and are
 * read on demand, never exposed as a flow and never logged (PRD §15).
 */
interface SessionStore {
    val state: Flow<SessionState>
    val onboardingSeen: Flow<Boolean>
    val pushEnabled: Flow<Boolean>

    suspend fun tokens(): AuthTokens?

    /** Login / registration completed: stores the pair and the user facts, switches the state to [SessionState.SignedIn]. */
    suspend fun signIn(tokens: AuthTokens, user: UserProfile)

    /** Rotation after a refresh; the state does not change. */
    suspend fun updateTokens(tokens: AuthTokens)

    suspend fun updateUser(user: UserProfile)

    suspend fun setOnboardingSeen(seen: Boolean)

    suspend fun setGuestProfile(profile: GuestProfile)

    suspend fun setPushEnabled(enabled: Boolean)

    /** Logout or an expired session: drops tokens and user facts; onboarding, guest identity and the push toggle stay. */
    suspend fun signOut()

    /** Account deletion: everything the store holds. */
    suspend fun clearAll()
}
