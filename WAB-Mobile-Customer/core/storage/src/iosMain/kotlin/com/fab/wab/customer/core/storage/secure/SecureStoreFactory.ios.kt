package com.fab.wab.customer.core.storage.secure

import androidx.datastore.core.DataStore
import androidx.datastore.preferences.core.Preferences
import com.fab.wab.customer.core.security.KeychainSecureStore
import com.fab.wab.customer.core.security.SecureKeyValueStore
import platform.Foundation.NSBundle

/** Keychain items are scoped by the app's bundle identifier (dev and prod bundles never share a session). */
actual fun createSecureKeyValueStore(dataStore: DataStore<Preferences>): SecureKeyValueStore =
    KeychainSecureStore(service = NSBundle.mainBundle.bundleIdentifier.orEmpty())
