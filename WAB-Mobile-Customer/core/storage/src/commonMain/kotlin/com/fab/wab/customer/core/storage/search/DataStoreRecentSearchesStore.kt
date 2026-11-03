package com.fab.wab.customer.core.storage.search

import androidx.datastore.core.DataStore
import androidx.datastore.preferences.core.Preferences
import androidx.datastore.preferences.core.edit
import androidx.datastore.preferences.core.stringPreferencesKey
import com.fab.wab.customer.core.domain.search.RecentSearchRules
import com.fab.wab.customer.core.domain.search.RecentSearchesStore
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.map

/**
 * Recent searches in the app's preferences (device only, BUSINESS_DOMAIN §5.22): one entry, texts joined by a control
 * character no search field can type, newest first.
 */
class DataStoreRecentSearchesStore(private val dataStore: DataStore<Preferences>) : RecentSearchesStore {

    override val recent: Flow<List<String>> = dataStore.data.map { decode(it[KEY]) }

    override suspend fun add(query: String) {
        dataStore.edit { preferences -> preferences[KEY] = encode(RecentSearchRules.add(decode(preferences[KEY]), query)) }
    }

    override suspend fun clear() {
        dataStore.edit { it.remove(KEY) }
    }

    internal companion object {
        private val KEY = stringPreferencesKey("recent_searches")
        private const val SEPARATOR = "\u001F"

        fun encode(items: List<String>): String = items.joinToString(SEPARATOR)

        fun decode(raw: String?): List<String> = raw?.split(SEPARATOR)?.filter { it.isNotBlank() }.orEmpty()
    }
}
