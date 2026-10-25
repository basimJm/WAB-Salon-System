package com.fab.wab.merchant.core.storage.secure

import androidx.datastore.core.DataStore
import androidx.datastore.preferences.core.Preferences
import com.fab.wab.merchant.core.security.SecureKeyValueStore

/** Android: Keystore-encrypted entries in [dataStore]; iOS: the Keychain (the DataStore is not used). */
expect fun createSecureKeyValueStore(dataStore: DataStore<Preferences>): SecureKeyValueStore
