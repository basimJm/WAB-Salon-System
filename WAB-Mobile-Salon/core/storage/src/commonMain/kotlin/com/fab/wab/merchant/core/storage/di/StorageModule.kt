package com.fab.wab.merchant.core.storage.di

import androidx.datastore.core.DataStore
import androidx.datastore.preferences.core.Preferences
import com.fab.wab.merchant.core.domain.AppSettings
import com.fab.wab.merchant.core.domain.session.SessionStore
import com.fab.wab.merchant.core.security.SecureKeyValueStore
import com.fab.wab.merchant.core.storage.AppSettingsImpl
import com.fab.wab.merchant.core.storage.DataStoreSessionStorage
import com.fab.wab.merchant.core.storage.SessionStorage
import com.fab.wab.merchant.core.storage.datastore.createDataStore
import com.fab.wab.merchant.core.storage.secure.createSecureKeyValueStore
import com.fab.wab.merchant.core.storage.session.DataStoreSessionStore
import com.fab.wab.merchant.core.storage.db.AppDatabase
import com.fab.wab.merchant.core.storage.db.dao.CachedItemDao
import com.fab.wab.merchant.core.storage.db.getDatabaseBuilder
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.IO
import org.koin.core.module.dsl.bind
import org.koin.core.module.dsl.singleOf
import org.koin.dsl.module

val storageModule = module {
    single<DataStore<Preferences>> {
        createDataStore(runCatching { getProperty<Any>("androidContext") }.getOrNull())
    }

    single<SecureKeyValueStore> { createSecureKeyValueStore(get()) }
    singleOf(::DataStoreSessionStore) { bind<SessionStore>() }
    singleOf(::AppSettingsImpl) { bind<AppSettings>() }
    singleOf(::DataStoreSessionStorage) { bind<SessionStorage>() }

    single<AppDatabase> {
        getDatabaseBuilder()
            .setQueryCoroutineContext(Dispatchers.IO)
            .build()
    }
    single<CachedItemDao> {
        get<AppDatabase>().getCachedItemDao()
    }
}
