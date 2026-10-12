package com.fab.wab.customer.core.storage

import androidx.datastore.core.DataStore
import androidx.datastore.preferences.core.Preferences
import androidx.datastore.preferences.core.edit
import com.fab.wab.customer.core.domain.AppLanguage
import com.fab.wab.customer.core.domain.AppSettings
import com.fab.wab.customer.core.domain.ThemeMode
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.map

class AppSettingsImpl(
    private val dataStore: DataStore<Preferences>
) : AppSettings {

    override val language: Flow<String> = dataStore.data.map { preferences ->
        preferences[PreferencesKeys.LANGUAGE] ?: AppLanguage.DEFAULT.code
    }

    override val themeMode: Flow<ThemeMode> = dataStore.data.map { preferences ->
        val themeName = preferences[PreferencesKeys.THEME_MODE] ?: ThemeMode.SYSTEM.name
        ThemeMode.fromString(themeName)
    }

    override val token: Flow<String?> = dataStore.data.map { preferences ->
        preferences[PreferencesKeys.TOKEN]
    }
    override val fcmToken: Flow<String?> = dataStore.data.map { preferences ->
        preferences[PreferencesKeys.FCM_TOKEN]
    }

    override val refreshToken: Flow<String?> = dataStore.data.map { preferences ->
        preferences[PreferencesKeys.REFRESH_TOKEN]
    }

    override val userId: Flow<String?> = dataStore.data.map { preferences ->
        preferences[PreferencesKeys.USER_ID]
    }

    override val userRole: Flow<String?> = dataStore.data.map { preferences ->
        preferences[PreferencesKeys.USER_ROLE]
    }

    override val userName: Flow<String?> = dataStore.data.map { preferences ->
        preferences[PreferencesKeys.USER_NAME]
    }

    override val onboardingCompleted: Flow<Boolean> = dataStore.data.map { preferences ->
        preferences[PreferencesKeys.ONBOARDING_COMPLETED] ?: false
    }

    override val lastSyncTimestamp: Flow<Long?> = dataStore.data.map { preferences ->
        preferences[PreferencesKeys.LAST_SYNC_TIMESTAMP]
    }

    override val deviceId: Flow<String?> = dataStore.data.map { preferences ->
        preferences[PreferencesKeys.DEVICE_ID]
    }

    override suspend fun setLanguage(language: String) {
        dataStore.edit { preferences ->
            preferences[PreferencesKeys.LANGUAGE] = language
        }
    }

    override suspend fun setThemeMode(mode: ThemeMode) {
        dataStore.edit { preferences ->
            preferences[PreferencesKeys.THEME_MODE] = mode.name
        }
    }

    override suspend fun setToken(token: String?) {
        dataStore.edit { preferences ->
            if (token != null) {
                preferences[PreferencesKeys.TOKEN] = token
            } else {
                preferences.remove(PreferencesKeys.TOKEN)
            }
        }
    }

    override suspend fun setFcmToken(fcmToken: String?) {
        dataStore.edit { preferences ->
            if (fcmToken != null) {
                preferences[PreferencesKeys.FCM_TOKEN] = fcmToken
            } else {
                preferences.remove(PreferencesKeys.FCM_TOKEN)
            }
        }
    }

    override suspend fun setRefreshToken(token: String?) {
        dataStore.edit { preferences ->
            if (token != null) {
                preferences[PreferencesKeys.REFRESH_TOKEN] = token
            } else {
                preferences.remove(PreferencesKeys.REFRESH_TOKEN)
            }
        }
    }

    override suspend fun setUserId(id: String?) {
        dataStore.edit { preferences ->
            if (id != null) {
                preferences[PreferencesKeys.USER_ID] = id
            } else {
                preferences.remove(PreferencesKeys.USER_ID)
            }
        }
    }

    override suspend fun setUserRole(role: String?) {
        dataStore.edit { preferences ->
            if (role != null) {
                preferences[PreferencesKeys.USER_ROLE] = role
            } else {
                preferences.remove(PreferencesKeys.USER_ROLE)
            }
        }
    }

    override suspend fun setUserName(name: String?) {
        dataStore.edit { preferences ->
            if (name != null) {
                preferences[PreferencesKeys.USER_NAME] = name
            } else {
                preferences.remove(PreferencesKeys.USER_NAME)
            }
        }
    }

    override suspend fun setOnboardingCompleted(completed: Boolean) {
        dataStore.edit { preferences ->
            preferences[PreferencesKeys.ONBOARDING_COMPLETED] = completed
        }
    }

    override suspend fun setLastSyncTimestamp(timestamp: Long) {
        dataStore.edit { preferences ->
            preferences[PreferencesKeys.LAST_SYNC_TIMESTAMP] = timestamp
        }
    }

    override suspend fun setDeviceId(id: String?) {
        dataStore.edit { preferences ->
            if (id != null) {
                preferences[PreferencesKeys.DEVICE_ID] = id
            } else {
                preferences.remove(PreferencesKeys.DEVICE_ID)
            }
        }
    }

    override suspend fun clearAll() {
        dataStore.edit { preferences ->
            preferences.clear()
        }
    }

    override suspend fun clearSession() {
        dataStore.edit { preferences ->
            preferences.remove(PreferencesKeys.TOKEN)
            preferences.remove(PreferencesKeys.REFRESH_TOKEN)
            preferences.remove(PreferencesKeys.USER_ID)
            preferences.remove(PreferencesKeys.USER_ROLE)
        }
    }
}
