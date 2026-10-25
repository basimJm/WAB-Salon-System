package com.fab.wab.merchant.core.storage.datastore

import android.content.Context
import androidx.datastore.core.DataStore
import androidx.datastore.preferences.core.Preferences

private const val DATA_STORE_NAME = "app_settings"

private const val CONTEXT_REQUIRED = "Context must be provided for Android platform"

actual fun createDataStore(context: Any?): DataStore<Preferences> {
    val androidContext = context as? Context ?: error(CONTEXT_REQUIRED)
    
    return getDataStore(
        producePath = {
            androidContext.filesDir
                .resolve(dataStoreFileName)
                .absolutePath
        }
    )
}

actual val dataStoreFileName: String = "${DATA_STORE_NAME}.preferences_pb"
