package com.fab.wab.customer.feature.home.data.repository

import com.fab.wab.customer.core.data.contract.generated.GetHomeData
import com.fab.wab.customer.core.data.contract.generated.GetHomeDataBannersItem
import com.fab.wab.customer.core.data.contract.generated.GetHomeDataClinicServicesItemsItem
import com.fab.wab.customer.core.data.contract.generated.GetHomeDataNearestClinicsItemsItem
import com.fab.wab.customer.core.data.contract.generated.GetHomeDataNearestSalonsItemsItem
import com.fab.wab.customer.core.data.contract.generated.GetHomeDataRecommendedClinicsItemsItem
import com.fab.wab.customer.core.data.contract.generated.GetHomeDataRecommendedSalonsItemsItem
import com.fab.wab.customer.core.data.contract.generated.GetHomeDataSalonServicesItemsItem
import com.fab.wab.customer.core.domain.salon.Audience
import com.fab.wab.customer.core.domain.salon.BranchRef
import com.fab.wab.customer.core.domain.salon.BusinessType
import com.fab.wab.customer.core.domain.salon.OpeningHours
import com.fab.wab.customer.core.domain.salon.SalonSummary
import com.fab.wab.customer.core.domain.salon.cardBranchCount
import com.fab.wab.customer.feature.home.domain.model.HomeBanner
import com.fab.wab.customer.feature.home.domain.model.HomeContent
import com.fab.wab.customer.feature.home.domain.model.HomeSection
import com.fab.wab.customer.feature.home.domain.model.HomeService
import com.fab.wab.customer.feature.home.domain.model.bannerActionOf

/** Contract 1.10.0 sections (the legacy `services` / `recommended` / `nearest` aliases are not read any more). */
fun GetHomeData.toDomain(): HomeContent = HomeContent(
    unreadCount = unreadCount?.toInt()?.coerceAtLeast(0) ?: 0,
    banners = banners.map { it.toDomain() },
    salonServices = HomeSection(salonServices.items.map { it.toDomain() }, salonServices.hasMore),
    clinicServices = HomeSection(clinicServices.items.map { it.toDomain() }, clinicServices.hasMore),
    recommendedSalons = HomeSection(recommendedSalons.items.map { it.toDomain() }, recommendedSalons.hasMore),
    recommendedClinics = HomeSection(recommendedClinics.items.map { it.toDomain() }, recommendedClinics.hasMore),
    nearestSalons = nearestSalons?.let { HomeSection(it.items.map { item -> item.toDomain() }, it.hasMore) },
    nearestClinics = nearestClinics?.let { HomeSection(it.items.map { item -> item.toDomain() }, it.hasMore) },
)

fun GetHomeDataBannersItem.toDomain(): HomeBanner = HomeBanner(id, imageUrl, bannerActionOf(actionType, actionValue))

fun GetHomeDataSalonServicesItemsItem.toDomain(): HomeService = homeService(id, name, description, imageUrl)

fun GetHomeDataClinicServicesItemsItem.toDomain(): HomeService = homeService(id, name, description, imageUrl)

fun GetHomeDataRecommendedSalonsItemsItem.toDomain(): SalonSummary = SalonSummary(
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
    businessType = BusinessType.fromCode(businessType),
    audience = Audience.fromCode(audience),
)

fun GetHomeDataRecommendedClinicsItemsItem.toDomain(): SalonSummary = SalonSummary(
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
    businessType = BusinessType.fromCode(businessType),
    audience = Audience.fromCode(audience),
)

fun GetHomeDataNearestSalonsItemsItem.toDomain(): SalonSummary = SalonSummary(
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
    title = title.takeIf { it.isNotBlank() },
    businessType = BusinessType.fromCode(businessType),
    audience = Audience.fromCode(audience),
)

fun GetHomeDataNearestClinicsItemsItem.toDomain(): SalonSummary = SalonSummary(
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
    title = title.takeIf { it.isNotBlank() },
    businessType = BusinessType.fromCode(businessType),
    audience = Audience.fromCode(audience),
)

private fun homeService(id: String, name: String, description: String, imageUrl: String): HomeService =
    HomeService(id = id, name = name, description = description, imageUrl = imageUrl.takeIf { it.isNotBlank() })
