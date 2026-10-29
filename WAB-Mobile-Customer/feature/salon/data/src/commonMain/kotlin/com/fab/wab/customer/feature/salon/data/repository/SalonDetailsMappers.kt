@file:Suppress("DEPRECATION") // kotlinx-datetime 0.7 deprecations on the K/N classpath until the datetime upgrade

package com.fab.wab.customer.feature.salon.data.repository

import com.fab.wab.customer.core.data.contract.generated.GetSalonsBySalonIdData
import com.fab.wab.customer.core.data.contract.generated.GetSalonsBySalonIdDataBranchesItem
import com.fab.wab.customer.core.data.contract.generated.GetSalonsBySalonIdDataBranchesItemWeeklyScheduleItem
import com.fab.wab.customer.core.data.contract.generated.GetSalonsBySalonIdDataGalleryItem
import com.fab.wab.customer.core.data.contract.generated.GetSalonsBySalonIdDataReviewsLatestItem
import com.fab.wab.customer.core.data.contract.generated.GetSalonsBySalonIdDataServicesItem
import com.fab.wab.customer.core.data.contract.generated.GetSalonsBySalonIdDataStaffItem
import com.fab.wab.customer.core.data.contract.generated.GetSalonsBySalonIdDataWeeklyScheduleItem
import com.fab.wab.customer.core.domain.model.LocationData
import com.fab.wab.customer.core.domain.salon.Audience
import com.fab.wab.customer.core.domain.salon.BranchRef
import com.fab.wab.customer.core.domain.salon.BusinessType
import com.fab.wab.customer.core.domain.salon.Closure
import com.fab.wab.customer.core.domain.salon.DaySchedule
import com.fab.wab.customer.core.domain.salon.DayOfWeek
import com.fab.wab.customer.core.domain.salon.GalleryItem
import com.fab.wab.customer.core.domain.salon.MediaType
import com.fab.wab.customer.core.domain.salon.OpeningHours
import com.fab.wab.customer.core.domain.salon.RatingSummary
import com.fab.wab.customer.core.domain.salon.Review
import com.fab.wab.customer.core.domain.salon.ReviewsPreview
import com.fab.wab.customer.core.domain.salon.SalonBranch
import com.fab.wab.customer.core.domain.salon.SalonDetails
import com.fab.wab.customer.core.domain.salon.SalonService
import com.fab.wab.customer.core.domain.salon.StaffPreview
import com.fab.wab.customer.core.domain.salon.StaffStatus

private const val MEDIA_VIDEO = "VIDEO"

fun GetSalonsBySalonIdData.toDomain(): SalonDetails = SalonDetails(
    id = id,
    name = name,
    businessType = BusinessType.fromCode(businessType),
    audience = Audience.fromCode(audience),
    coverUrl = coverUrl?.takeIf { it.isNotBlank() },
    profileImageUrl = profileImageUrl?.takeIf { it.isNotBlank() },
    description = description?.takeIf { it.isNotBlank() },
    locationText = locationText?.takeIf { it.isNotBlank() },
    location = location?.let { LocationData(it.lat, it.lng) },
    phone = phone?.takeIf { it.isNotBlank() },
    whatsapp = whatsapp?.takeIf { it.isNotBlank() },
    rating = RatingSummary(rating.avg.toFloat(), rating.count.toInt()),
    isOpenNow = isOpenNow,
    todayHours = todayHours?.let { OpeningHours(it.open, it.close) },
    closedReason = closedReason?.takeIf { it.isNotBlank() },
    weeklySchedule = weeklySchedule.map { it.toDomain() },
    upcomingClosures = upcomingClosures.map { Closure(it.from, it.to, it.reason) },
    staff = staff.map { it.toDomain() },
    services = services.map { it.toDomain() },
    gallery = gallery.map { it.toDomain() },
    isFavorite = isFavorite,
    reviews = ReviewsPreview(RatingSummary(reviews.avg.toFloat(), reviews.count.toInt()), reviews.latest.map { it.toDomain() }),
    branches = branches.map { it.toDomain() }.sortedByDescending { it.isMain },
)

/** A bookable branch (§5.17); the server sends main first, the stable sort keeps that even if it did not. */
fun GetSalonsBySalonIdDataBranchesItem.toDomain(): SalonBranch = SalonBranch(
    id = id,
    name = name,
    isMain = isMain,
    locationText = locationText?.takeIf { it.isNotBlank() },
    location = location?.let { LocationData(it.lat, it.lng) },
    phone = phone?.takeIf { it.isNotBlank() },
    whatsapp = whatsapp?.takeIf { it.isNotBlank() },
    isOpenNow = isOpenNow,
    todayHours = todayHours?.let { OpeningHours(it.open, it.close) },
    closedReason = closedReason?.takeIf { it.isNotBlank() },
    weeklySchedule = weeklySchedule.map { it.toDomain() },
    upcomingClosures = upcomingClosures.map { Closure(it.from, it.to, it.reason) },
)

fun GetSalonsBySalonIdDataBranchesItemWeeklyScheduleItem.toDomain(): DaySchedule =
    DaySchedule(day = DayOfWeek.fromCode(day), isOff = isOff, hours = if (isOff) null else OpeningHours(open, close))

fun GetSalonsBySalonIdDataWeeklyScheduleItem.toDomain(): DaySchedule =
    DaySchedule(day = DayOfWeek.fromCode(day), isOff = isOff, hours = if (isOff) null else OpeningHours(open, close))

fun GetSalonsBySalonIdDataStaffItem.toDomain(): StaffPreview =
    StaffPreview(id = id, firstName = firstName, photoUrl = photoUrl, status = StaffStatus.fromCode(status), branchId = branchId)

fun GetSalonsBySalonIdDataServicesItem.toDomain(): SalonService = SalonService(
    id = id,
    catalogServiceId = catalogServiceId,
    name = name,
    imageUrl = imageUrl.takeIf { it.isNotBlank() },
    description = description?.takeIf { it.isNotBlank() },
    price = price,
    durationMinutes = durationMinutes.toInt(),
    mediaUrls = mediaUrls,
    branchId = branchId,
    brideOnly = brideOnly,
)

fun GetSalonsBySalonIdDataGalleryItem.toDomain(): GalleryItem = GalleryItem(
    id = id,
    type = if (type.equals(MEDIA_VIDEO, ignoreCase = true)) MediaType.VIDEO else MediaType.IMAGE,
    url = url,
    thumbnailUrl = thumbnailUrl,
)

fun GetSalonsBySalonIdDataReviewsLatestItem.toDomain(): Review =
    Review(
        id = id,
        customerName = customerName,
        rating = rating.toFloat(),
        comment = comment,
        createdAt = createdAt,
        branch = branch?.let { BranchRef(it.id, it.name) },
    )
