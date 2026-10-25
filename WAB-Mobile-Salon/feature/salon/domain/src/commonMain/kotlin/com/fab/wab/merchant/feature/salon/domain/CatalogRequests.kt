package com.fab.wab.merchant.feature.salon.domain

import com.fab.wab.merchant.core.domain.AppResult

enum class CatalogRequestStatus { PENDING, APPROVED, REJECTED }

/** A request to add a service to the admin catalog (`/catalog/requests`). */
data class CatalogRequest(
    val id: String,
    val name: String,
    val description: String,
    val status: CatalogRequestStatus,
    val adminNote: String?,
    val createdAt: String,
)

object CatalogRequestLimits {
    const val NAME_MAX = 100
    const val DESCRIPTION_MAX = 500
}

fun catalogRequestValid(name: String, description: String): Boolean =
    name.trim().length in 1..CatalogRequestLimits.NAME_MAX && description.trim().length in 1..CatalogRequestLimits.DESCRIPTION_MAX

interface CatalogRequestsRepository {
    suspend fun list(page: Int): AppResult<List<CatalogRequest>>

    suspend fun create(name: String, description: String, imageKey: String?): AppResult<CatalogRequest>
}
