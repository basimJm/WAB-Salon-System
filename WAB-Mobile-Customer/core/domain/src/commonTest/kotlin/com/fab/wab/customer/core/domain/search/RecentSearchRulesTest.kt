package com.fab.wab.customer.core.domain.search

import kotlinx.coroutines.flow.first
import kotlinx.coroutines.test.runTest
import kotlin.test.Test
import kotlin.test.assertEquals

/** CUS-103: recent searches on the device — newest first, no duplicates, capped. */
class RecentSearchRulesTest {

    @Test
    fun newestFirstTrimmedAndDeduplicatedIgnoringCase() {
        val list = RecentSearchRules.add(listOf("Haircut", "Botox"), "  botox ")
        assertEquals(listOf("botox", "Haircut"), list)
    }

    @Test
    fun blankTextsAreIgnored() {
        assertEquals(listOf("Nails"), RecentSearchRules.add(listOf("Nails"), "   "))
    }

    @Test
    fun theListKeepsAtMostTheMaximum() {
        val full = (1..RecentSearchRules.MAX_ITEMS).map { "q$it" }
        val list = RecentSearchRules.add(full, "new")
        assertEquals(RecentSearchRules.MAX_ITEMS, list.size)
        assertEquals("new", list.first())
        assertEquals("q${RecentSearchRules.MAX_ITEMS - 1}", list.last(), "the oldest falls off")
    }

    @Test
    fun inMemoryStoreAddsAndClears() = runTest {
        val store = InMemoryRecentSearchesStore()
        store.add("Laser")
        store.add("Tattoo")
        assertEquals(listOf("Tattoo", "Laser"), store.recent.first())
        store.clear()
        assertEquals(emptyList(), store.recent.first())
    }
}
