package com.fab.wab.customer.core.domain

interface AppDataDomain<out T> {
    fun toDomain(): T
    fun toDomain(isArabic: Boolean = false): T = toDomain()
}
