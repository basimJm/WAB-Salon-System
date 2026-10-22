package com.fab.wab.merchant.core.data.mapper

import com.fab.wab.merchant.core.domain.model.CachedItem
import com.fab.wab.merchant.core.storage.db.entity.CachedItemEntity

fun CachedItem.toEntity(): CachedItemEntity = CachedItemEntity(
    id = id,
    title = title,
    description = description,
    updatedAt = updatedAt,
)

fun CachedItemEntity.toDomain(): CachedItem = CachedItem(
    id = id,
    title = title,
    description = description,
    updatedAt = updatedAt,
)
