package com.fab.wab.customer.feature.home.data.repository

import com.fab.wab.customer.core.data.contract.generated.GetHomeData
import com.fab.wab.customer.core.data.contract.generated.GetHomeDataBannersItem
import com.fab.wab.customer.core.data.contract.generated.GetHomeDataNearestItemsItem
import com.fab.wab.customer.core.data.contract.generated.GetHomeDataRecommendedItemsItem
import com.fab.wab.customer.core.data.contract.generated.GetHomeDataServicesItemsItem
import com.fab.wab.customer.core.domain.salon.OpeningHours
import com.fab.wab.customer.core.domain.salon.SalonSummary
import com.fab.wab.customer.feature.home.domain.model.HomeBanner
import com.fab.wab.customer.feature.home.domain.model.HomeContent
import com.fab.wab.customer.feature.home.domain.model.HomeSection
import com.fab.wab.customer.feature.home.domain.model.HomeService
import com.fab.wab.customer.feature.home.domain.model.bannerActionOf

fun GetHomeData.toDomain(): HomeContent = HomeContent(
    unreadCount = unreadCount?.toInt()?.coerceAtLeast(0) ?: 0,
    banners = banners.map { it.toDomain() },
    services = HomeSection(services.items.map { it.toDomain() }, services.hasMore),
    recommended = HomeSection(recommended.items.map { it.toDomain() }, recommended.hasMore),
    nearest = nearest?.let { HomeSection(it.items.map { item -> item.toDomain() }, it.hasMore) },
)

fun GetHomeDataBannersItem.toDomain(): HomeBanner = HomeBanner(id, imageUrl, bannerActionOf(actionType, actionValue))

fun GetHomeDataServicesItemsItem.toDomain(): HomeService =
    HomeService(id = id, name = name, description = description, imageUrl = imageUrl.takeIf { it.isNotBlank() })

fun GetHomeDataRecommendedItemsItem.toDomain(): SalonSummary = SalonSummary(
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
)

fun GetHomeDataNearestItemsItem.toDomain(): SalonSummary = SalonSummary(
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
)
