package com.fab.wab.merchant.core.storage.session

import androidx.datastore.core.DataStore
import androidx.datastore.preferences.core.MutablePreferences
import androidx.datastore.preferences.core.Preferences
import androidx.datastore.preferences.core.edit
import com.fab.wab.merchant.core.domain.auth.AuthTokens
import com.fab.wab.merchant.core.domain.session.MemberProfile
import com.fab.wab.merchant.core.domain.session.MemberRole
import com.fab.wab.merchant.core.domain.session.SalonState
import com.fab.wab.merchant.core.domain.session.SessionState
import com.fab.wab.merchant.core.domain.session.SessionStore
import com.fab.wab.merchant.core.security.SecureKeyValueStore
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.distinctUntilChanged
import kotlinx.coroutines.flow.map

/** [SessionStore] over DataStore (plain keys) and the platform secure store (tokens). */
class DataStoreSessionStore(
    private val dataStore: DataStore<Preferences>,
    private val secure: SecureKeyValueStore,
) : SessionStore {

    override val state: Flow<SessionState> = dataStore.data.map(::stateOf).distinctUntilChanged()

    override val pushEnabled: Flow<Boolean> =
        dataStore.data.map { it[SessionKeys.PUSH_ENABLED] ?: SessionKeys.PUSH_ENABLED_DEFAULT }.distinctUntilChanged()

    override val overlayPermissionPrompted: Flow<Boolean> =
        dataStore.data.map { it[SessionKeys.OVERLAY_PERMISSION_PROMPTED] ?: false }.distinctUntilChanged()

    override suspend fun tokens(): AuthTokens? {
        val access = secure.read(SessionKeys.SECURE_ACCESS)?.takeIf { it.isNotBlank() } ?: return null
        val refresh = secure.read(SessionKeys.SECURE_REFRESH)?.takeIf { it.isNotBlank() } ?: return null
        return AuthTokens(access, refresh)
    }

    override suspend fun signIn(tokens: AuthTokens, member: MemberProfile, permissions: Set<String>, salonState: SalonState?) {
        writeTokens(tokens)
        dataStore.edit { prefs ->
            prefs.putMember(member)
            prefs[SessionKeys.PERMISSIONS] = permissions
            prefs.putSalonState(salonState)
            prefs[SessionKeys.SIGNED_IN] = true
        }
    }

    override suspend fun updateTokens(tokens: AuthTokens) = writeTokens(tokens)

    override suspend fun updateMember(member: MemberProfile) {
        dataStore.edit { it.putMember(member) }
    }

    override suspend fun updatePermissions(permissions: Set<String>) {
        dataStore.edit { it[SessionKeys.PERMISSIONS] = permissions }
    }

    override suspend fun updateSalonState(salonState: SalonState?) {
        dataStore.edit { it.putSalonState(salonState) }
    }

    override suspend fun setPushEnabled(enabled: Boolean) {
        dataStore.edit { it[SessionKeys.PUSH_ENABLED] = enabled }
    }

    override suspend fun setOverlayPermissionPrompted(prompted: Boolean) {
        dataStore.edit { it[SessionKeys.OVERLAY_PERMISSION_PROMPTED] = prompted }
    }

    override suspend fun signOut() {
        writeTokens(null)
        dataStore.edit { prefs -> IDENTITY_KEYS.forEach { prefs.remove(it) } }
    }

    override suspend fun clearAll() {
        writeTokens(null)
        dataStore.edit { prefs -> (IDENTITY_KEYS + PREFERENCE_KEYS).forEach { prefs.remove(it) } }
    }

    private suspend fun writeTokens(tokens: AuthTokens?) {
        secure.write(SessionKeys.SECURE_ACCESS, tokens?.accessToken)
        secure.write(SessionKeys.SECURE_REFRESH, tokens?.refreshToken)
    }

    private fun MutablePreferences.putMember(member: MemberProfile) {
        this[SessionKeys.MEMBER_ID] = member.id
        this[SessionKeys.SALON_ID] = member.salonId
        this[SessionKeys.MEMBER_FIRST_NAME] = member.firstName
        this[SessionKeys.MEMBER_ROLE] = member.role.name
    }

    private fun MutablePreferences.putSalonState(salonState: SalonState?) {
        if (salonState == null) remove(SessionKeys.SALON_STATE) else this[SessionKeys.SALON_STATE] = salonState.name
    }

    private companion object {
        /** Cleared on sign-out. */
        val IDENTITY_KEYS: List<Preferences.Key<*>> = listOf(
            SessionKeys.SIGNED_IN,
            SessionKeys.MEMBER_ID,
            SessionKeys.SALON_ID,
            SessionKeys.MEMBER_FIRST_NAME,
            SessionKeys.MEMBER_ROLE,
            SessionKeys.PERMISSIONS,
            SessionKeys.SALON_STATE,
        )

        /** Kept on sign-out, cleared only by [clearAll]. */
        val PREFERENCE_KEYS: List<Preferences.Key<*>> = listOf(
            SessionKeys.PUSH_ENABLED,
            SessionKeys.OVERLAY_PERMISSION_PROMPTED,
        )
    }
}

/** Pure: the signed-in marker plus a complete member identity is a session; anything else is a guest. */
fun stateOf(prefs: Preferences): SessionState {
    val member = if (prefs[SessionKeys.SIGNED_IN] == true) memberOf(prefs) else null
    return if (member != null) {
        SessionState.SignedIn(
            member = member,
            permissions = prefs[SessionKeys.PERMISSIONS].orEmpty(),
            salonState = SalonState.fromCode(prefs[SessionKeys.SALON_STATE]),
        )
    } else {
        SessionState.Guest
    }
}

private fun memberOf(prefs: Preferences): MemberProfile? {
    val id = prefs[SessionKeys.MEMBER_ID]
    val salonId = prefs[SessionKeys.SALON_ID]
    val firstName = prefs[SessionKeys.MEMBER_FIRST_NAME]
    val role = MemberRole.fromCode(prefs[SessionKeys.MEMBER_ROLE]) ?: return null
    return if (id != null && salonId != null && firstName != null) MemberProfile(id, salonId, firstName, role) else null
}
