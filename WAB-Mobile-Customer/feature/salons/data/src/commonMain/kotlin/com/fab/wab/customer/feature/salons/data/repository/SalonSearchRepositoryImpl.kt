package com.fab.wab.customer.feature.salons.data.repository

import com.fab.wab.customer.core.data.contract.generated.GetSalonsDataItem
import com.fab.wab.customer.core.domain.AppResult
import com.fab.wab.customer.core.domain.mapSuccess
import com.fab.wab.customer.core.domain.salon.BranchRef
import com.fab.wab.customer.core.domain.salon.OpeningHours
import com.fab.wab.customer.core.domain.salon.SalonQuery
import com.fab.wab.customer.core.domain.salon.SalonSearchRepository
import com.fab.wab.customer.core.domain.salon.SalonSummary
import com.fab.wab.customer.core.domain.salon.cardBranchCount
import com.fab.wab.customer.core.network.safeApiCall
import com.fab.wab.customer.feature.salons.data.remote.SalonSearchApi

class SalonSearchRepositoryImpl(private val api: SalonSearchApi) : SalonSearchRepository {
    override suspend fun search(query: SalonQuery): AppResult<List<SalonSummary>> =
        safeApiCall { api.search(query) }.mapSuccess { response -> response.data.map { it.toDomain() } }
}

fun GetSalonsDataItem.toDomain(): SalonSummary = SalonSummary(
    id = id,
    name = name,
    imageUrl = profileImageUrl,
    rating = rating.toFloat(),
    reviewsCount = reviewsCount.toInt(),
    locationText = locationText,
    shortDescription = shortDescription,
    isOpenNow = isOpenNow,
    todayHours = todayHours?.let { OpeningHours(it.open, it.close) },
    isFavorite = isFavorite,
    distanceKm = distanceKm,
    branchCount = cardBranchCount(branchCount),
    branch = branch?.let { BranchRef(it.id, it.name) },
)
