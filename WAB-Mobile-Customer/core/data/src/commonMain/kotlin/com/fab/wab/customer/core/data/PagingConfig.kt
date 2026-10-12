package com.fab.wab.customer.core.data

import androidx.paging.PagingConfig

val DefaultPagingConfig = PagingConfig(
    pageSize = 20,
    prefetchDistance = 10,
    enablePlaceholders = false,
    initialLoadSize = 40,
)
