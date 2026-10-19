package com.fab.wab.customer.core.storage.di

import androidx.datastore.core.DataStore
import androidx.datastore.preferences.core.Preferences
import com.fab.wab.customer.core.domain.AppSettings
import com.fab.wab.customer.core.domain.session.SessionStore
import com.fab.wab.customer.core.security.SecureKeyValueStore
import com.fab.wab.customer.core.storage.AppSettingsImpl
import com.fab.wab.customer.core.storage.DataStoreSessionStorage
import com.fab.wab.customer.core.storage.SessionStorage
import com.fab.wab.customer.core.storage.datastore.createDataStore
import com.fab.wab.customer.core.storage.secure.createSecureKeyValueStore
import com.fab.wab.customer.core.storage.session.DataStoreSessionStore
import com.fab.wab.customer.core.storage.db.AppDatabase
import com.fab.wab.customer.core.storage.db.dao.CachedItemDao
import com.fab.wab.customer.core.storage.db.getDatabaseBuilder
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
