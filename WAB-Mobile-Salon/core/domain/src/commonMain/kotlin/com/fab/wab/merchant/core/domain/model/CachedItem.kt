package com.fab.wab.merchant.core.domain.model

data class CachedItem(
    val id: Int = 0,
    val title: String,
    val description: String,
    val updatedAt: Long,
)
