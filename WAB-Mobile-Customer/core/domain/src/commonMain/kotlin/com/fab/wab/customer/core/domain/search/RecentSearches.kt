package com.fab.wab.customer.core.domain.search

import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow

/** Search texts the customer submitted, newest first, kept on the device only (BUSINESS_DOMAIN §5.22). */
interface RecentSearchesStore {
    val recent: Flow<List<String>>
    suspend fun add(query: String)
    suspend fun clear()
}

object RecentSearchRules {
    /** How many recent searches the device keeps. */
    const val MAX_ITEMS = 8

    /**
     * [query] trimmed goes first; an earlier copy (any case) is removed; blank texts are ignored; at most [max] remain.
     */
    fun add(current: List<String>, query: String, max: Int = MAX_ITEMS): List<String> {
        val text = query.trim()
        if (text.isEmpty()) return current.take(max)
        return (listOf(text) + current.filterNot { it.equals(text, ignoreCase = true) }).take(max)
    }
}

/** Process-memory store (tests and previews). */
class InMemoryRecentSearchesStore(initial: List<String> = emptyList()) : RecentSearchesStore {
    private val items = MutableStateFlow(initial)
    override val recent: StateFlow<List<String>> = items
    override suspend fun add(query: String) {
        items.value = RecentSearchRules.add(items.value, query)
    }
    override suspend fun clear() {
        items.value = emptyList()
    }
}
