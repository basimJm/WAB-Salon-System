package com.fab.wab.customer.feature.home.data.repository

import com.fab.wab.customer.core.data.contract.generated.GetHomeData
import com.fab.wab.customer.core.data.contract.generated.GetHomeDataBannersItem
import com.fab.wab.customer.core.data.contract.generated.GetHomeDataBookAgainItemsItem
import com.fab.wab.customer.core.data.contract.generated.GetHomeDataExploreItemsItem
import com.fab.wab.customer.core.data.contract.generated.GetHomeDataNearYouItemsItem
import com.fab.wab.customer.core.data.contract.generated.GetHomeDataRecommendedAllItemsItem
import com.fab.wab.customer.core.domain.salon.Audience
import com.fab.wab.customer.core.domain.salon.BranchRef
import com.fab.wab.customer.core.domain.salon.BusinessType
import com.fab.wab.customer.core.domain.salon.OpeningHours
import com.fab.wab.customer.core.domain.salon.SalonSummary
import com.fab.wab.customer.core.domain.salon.cardBranchCount
import com.fab.wab.customer.feature.home.domain.model.BookAgainEntry
import com.fab.wab.customer.feature.home.domain.model.HomeBanner
import com.fab.wab.customer.feature.home.domain.model.HomeContent
import com.fab.wab.customer.feature.home.domain.model.HomeSection
import com.fab.wab.customer.feature.home.domain.model.HomeService
import com.fab.wab.customer.feature.home.domain.model.bannerActionOf

/**
 * Contract 1.13.0 merged sections (BUSINESS_DOMAIN §5.22). The per-type keys (`salonServices`, `recommendedClinics`, …) stay
 * in the payload for older apps and are not read any more.
 */
fun GetHomeData.toDomain(): HomeContent = HomeContent(
    unreadCount = unreadCount?.toInt()?.coerceAtLeast(0) ?: 0,
    banners = banners.map { it.toDomain() },
    explore = HomeSection(explore.items.map { it.toDomain() }, explore.hasMore),
    nearYou = nearYou?.let { HomeSection(it.items.map { item -> item.toDomain() }, it.hasMore) },
    recommended = HomeSection(recommendedAll.items.map { it.toDomain() }, recommendedAll.hasMore),
    bookAgain = bookAgain?.let { HomeSection(it.items.map { item -> item.toDomain() }, it.hasMore) },
)

fun GetHomeDataBannersItem.toDomain(): HomeBanner = HomeBanner(id, imageUrl, bannerActionOf(actionType, actionValue))

fun GetHomeDataExploreItemsItem.toDomain(): HomeService = HomeService(
    id = id,
    name = name,
    description = description,
    imageUrl = imageUrl.takeIf { it.isNotBlank() },
    businessType = BusinessType.fromCode(businessType),
)

fun GetHomeDataRecommendedAllItemsItem.toDomain(): SalonSummary = SalonSummary(
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

/** A Near you entry is one branch ("Salon - Branch"): the title marks it, as in the old nearest sections. */
fun GetHomeDataNearYouItemsItem.toDomain(): SalonSummary = SalonSummary(
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

fun GetHomeDataBookAgainItemsItem.toDomain(): BookAgainEntry = BookAgainEntry(
    salon = SalonSummary(
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
    ),
    lastBookingId = lastBooking.id,
    salonServiceIds = lastBooking.salonServiceIds,
)
