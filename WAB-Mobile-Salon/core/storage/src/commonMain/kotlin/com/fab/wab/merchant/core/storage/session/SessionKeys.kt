package com.fab.wab.merchant.core.storage.session

import androidx.datastore.preferences.core.Preferences.Key
import androidx.datastore.preferences.core.booleanPreferencesKey
import androidx.datastore.preferences.core.stringPreferencesKey
import androidx.datastore.preferences.core.stringSetPreferencesKey

/** PRD §5 keys. Plain values live in DataStore; the two token keys name entries of the secure store. */
object SessionKeys {
    val MEMBER_ID: Key<String> = stringPreferencesKey("member_id")
    val SALON_ID: Key<String> = stringPreferencesKey("salon_id")
    val MEMBER_FIRST_NAME: Key<String> = stringPreferencesKey("member_first_name")
    val MEMBER_ROLE: Key<String> = stringPreferencesKey("member_role")

    /** Branch of a manager / employee (absent for the owner = every branch). */
    val MEMBER_BRANCH_ID: Key<String> = stringPreferencesKey("member_branch_id")
    val PERMISSIONS: Key<Set<String>> = stringSetPreferencesKey("permissions")
    val SALON_STATE: Key<String> = stringPreferencesKey("salon_state")
    val PUSH_ENABLED: Key<Boolean> = booleanPreferencesKey("push_enabled")
    val OVERLAY_PERMISSION_PROMPTED: Key<Boolean> = booleanPreferencesKey("overlay_permission_prompted")

    /** Non-secret marker that a token pair exists, so the session state can be a flow without reading the secure store. */
    val SIGNED_IN: Key<Boolean> = booleanPreferencesKey("signed_in")

    /** Entry names in the secure store (not DataStore keys). */
    const val SECURE_ACCESS = "access_token"
    const val SECURE_REFRESH = "refresh_token"

    /** Push is on by default; the OS permission still gates delivery. */
    const val PUSH_ENABLED_DEFAULT = true
}
