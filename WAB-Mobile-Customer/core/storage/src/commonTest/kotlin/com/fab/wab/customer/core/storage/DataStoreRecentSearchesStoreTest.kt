package com.fab.wab.customer.core.storage

import com.fab.wab.customer.core.domain.search.RecentSearchRules
import com.fab.wab.customer.core.storage.search.DataStoreRecentSearchesStore
import kotlinx.coroutines.flow.first
import kotlinx.coroutines.test.runTest
import kotlin.test.Test
import kotlin.test.assertEquals

/** CUS-103: recent searches survive in the preferences store, newest first, deduplicated and capped. */
class DataStoreRecentSearchesStoreTest {

    @Test
    fun addsNewestFirstDeduplicatesAndClears() = runTest {
        val store = DataStoreRecentSearchesStore(InMemoryPreferencesDataStore())
        assertEquals(emptyList(), store.recent.first())
        store.add("Haircut")
        store.add("Laser, face")
        store.add("haircut")
        assertEquals(listOf("haircut", "Laser, face"), store.recent.first(), "commas inside a text are kept")
        repeat(RecentSearchRules.MAX_ITEMS + 2) { store.add("q$it") }
        assertEquals(RecentSearchRules.MAX_ITEMS, store.recent.first().size)
        store.clear()
        assertEquals(emptyList(), store.recent.first())
    }

    @Test
    fun encodingRoundTrips() {
        val items = listOf("a b", "ج", "x,y")
        assertEquals(items, DataStoreRecentSearchesStore.decode(DataStoreRecentSearchesStore.encode(items)))
        assertEquals(emptyList(), DataStoreRecentSearchesStore.decode(null))
    }
}
