package com.fab.wab.customer.core.storage.session

import androidx.datastore.core.DataStore
import androidx.datastore.preferences.core.MutablePreferences
import androidx.datastore.preferences.core.Preferences
import androidx.datastore.preferences.core.edit
import com.fab.wab.customer.core.domain.auth.AuthTokens
import com.fab.wab.customer.core.domain.session.Gender
import com.fab.wab.customer.core.domain.session.GuestProfile
import com.fab.wab.customer.core.domain.session.SessionState
import com.fab.wab.customer.core.domain.session.SessionStore
import com.fab.wab.customer.core.domain.session.UserProfile
import com.fab.wab.customer.core.security.SecureKeyValueStore
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.distinctUntilChanged
import kotlinx.coroutines.flow.map

/** [SessionStore] over DataStore (plain keys) and the platform secure store (tokens). */
class DataStoreSessionStore(
    private val dataStore: DataStore<Preferences>,
    private val secure: SecureKeyValueStore,
) : SessionStore {

    override val state: Flow<SessionState> = dataStore.data.map(::stateOf).distinctUntilChanged()

    override val onboardingSeen: Flow<Boolean> =
        dataStore.data.map { it[SessionKeys.ONBOARDING_SEEN] ?: false }.distinctUntilChanged()

    override val pushEnabled: Flow<Boolean> =
        dataStore.data.map { it[SessionKeys.PUSH_ENABLED] ?: SessionKeys.PUSH_ENABLED_DEFAULT }.distinctUntilChanged()

    override suspend fun tokens(): AuthTokens? {
        val access = secure.read(SessionKeys.SECURE_ACCESS)?.takeIf { it.isNotBlank() } ?: return null
        val refresh = secure.read(SessionKeys.SECURE_REFRESH)?.takeIf { it.isNotBlank() } ?: return null
        return AuthTokens(access, refresh)
    }

    override suspend fun signIn(tokens: AuthTokens, user: UserProfile) {
        writeTokens(tokens)
        dataStore.edit { prefs ->
            prefs.putUser(user)
            prefs[SessionKeys.SIGNED_IN] = true
        }
    }

    override suspend fun updateTokens(tokens: AuthTokens) = writeTokens(tokens)

    override suspend fun updateUser(user: UserProfile) {
        dataStore.edit { it.putUser(user) }
    }

    override suspend fun setOnboardingSeen(seen: Boolean) {
        dataStore.edit { it[SessionKeys.ONBOARDING_SEEN] = seen }
    }

    override suspend fun setGuestProfile(profile: GuestProfile) {
        dataStore.edit { prefs ->
            prefs.putOrRemove(SessionKeys.GUEST_NICKNAME, profile.nickname?.takeIf { it.isNotBlank() })
            prefs.putOrRemove(SessionKeys.GUEST_GENDER, profile.gender?.code)
        }
    }

    override suspend fun setPushEnabled(enabled: Boolean) {
        dataStore.edit { it[SessionKeys.PUSH_ENABLED] = enabled }
    }

    override suspend fun signOut() {
        writeTokens(null)
        dataStore.edit { prefs ->
            prefs.remove(SessionKeys.SIGNED_IN)
            prefs.remove(SessionKeys.USER_ID)
            prefs.remove(SessionKeys.USER_FIRST_NAME)
            prefs.remove(SessionKeys.USER_GENDER)
        }
    }

    override suspend fun clearAll() {
        writeTokens(null)
        dataStore.edit { prefs -> SESSION_PREFERENCE_KEYS.forEach { prefs.remove(it) } }
    }

    private suspend fun writeTokens(tokens: AuthTokens?) {
        secure.write(SessionKeys.SECURE_ACCESS, tokens?.accessToken)
        secure.write(SessionKeys.SECURE_REFRESH, tokens?.refreshToken)
    }

    private fun MutablePreferences.putUser(user: UserProfile) {
        this[SessionKeys.USER_ID] = user.id
        this[SessionKeys.USER_FIRST_NAME] = user.firstName
        putOrRemove(SessionKeys.USER_GENDER, user.gender?.code)
    }

    private fun MutablePreferences.putOrRemove(key: Preferences.Key<String>, value: String?) {
        if (value == null) remove(key) else this[key] = value
    }

    private companion object {
        val SESSION_PREFERENCE_KEYS: List<Preferences.Key<*>> = listOf(
            SessionKeys.ONBOARDING_SEEN,
            SessionKeys.GUEST_NICKNAME,
            SessionKeys.GUEST_GENDER,
            SessionKeys.USER_ID,
            SessionKeys.USER_FIRST_NAME,
            SessionKeys.USER_GENDER,
            SessionKeys.PUSH_ENABLED,
            SessionKeys.SIGNED_IN,
        )
    }
}

/** Pure: a signed-in marker plus the user id and first name is a registered session; anything else is a guest. */
fun stateOf(prefs: Preferences): SessionState {
    val id = prefs[SessionKeys.USER_ID]
    val firstName = prefs[SessionKeys.USER_FIRST_NAME]
    return if (prefs[SessionKeys.SIGNED_IN] == true && id != null && firstName != null) {
        SessionState.SignedIn(UserProfile(id, firstName, Gender.fromCode(prefs[SessionKeys.USER_GENDER])))
    } else {
        SessionState.Guest(GuestProfile(prefs[SessionKeys.GUEST_NICKNAME], Gender.fromCode(prefs[SessionKeys.GUEST_GENDER])))
    }
}
