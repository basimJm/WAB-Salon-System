package com.fab.wab.merchant.core.storage.secure

import androidx.datastore.core.DataStore
import androidx.datastore.preferences.core.Preferences
import com.fab.wab.merchant.core.security.KeystoreCipher
import com.fab.wab.merchant.core.security.SecureKeyValueStore

/** Alias of the non-exportable AES key in the Android Keystore; changing it orphans stored tokens (users sign in again). */
private const val KEY_ALIAS = "wab_customer_session"

actual fun createSecureKeyValueStore(dataStore: DataStore<Preferences>): SecureKeyValueStore =
    EncryptedPreferencesSecureStore(dataStore, KeystoreCipher(KEY_ALIAS))
