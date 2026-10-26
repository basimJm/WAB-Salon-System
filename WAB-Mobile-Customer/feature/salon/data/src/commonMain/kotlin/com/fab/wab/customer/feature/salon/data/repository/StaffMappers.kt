@file:Suppress("DEPRECATION") // kotlinx-datetime 0.7 deprecations on the K/N classpath until the datetime upgrade

package com.fab.wab.customer.feature.salon.data.repository

import com.fab.wab.customer.core.data.contract.generated.GetSalonsBySalonIdStaffByMemberIdData
import com.fab.wab.customer.core.data.contract.generated.GetSalonsBySalonIdStaffByMemberIdDataReviewsLatestItem
import com.fab.wab.customer.core.data.contract.generated.GetSalonsBySalonIdStaffByMemberIdDataWorkingDaysItem
import com.fab.wab.customer.core.domain.salon.BranchRef
import com.fab.wab.customer.core.domain.salon.DayOfWeek
import com.fab.wab.customer.core.domain.salon.MemberRole
import com.fab.wab.customer.core.domain.salon.OpeningHours
import com.fab.wab.customer.core.domain.salon.RatingSummary
import com.fab.wab.customer.core.domain.salon.Review
import com.fab.wab.customer.core.domain.salon.ReviewsPreview
import com.fab.wab.customer.core.domain.salon.StaffMember
import com.fab.wab.customer.core.domain.salon.StaffServiceRef
import com.fab.wab.customer.core.domain.salon.StaffStatus
import com.fab.wab.customer.core.domain.salon.WorkingDay

fun GetSalonsBySalonIdStaffByMemberIdData.toDomain(): StaffMember = StaffMember(
    id = id,
    firstName = firstName,
    photoUrl = photoUrl?.takeIf { it.isNotBlank() },
    status = StaffStatus.fromCode(status),
    role = MemberRole.fromCode(role),
    rating = RatingSummary(rating.avg.toFloat(), rating.count.toInt()),
    bio = bio?.takeIf { it.isNotBlank() },
    yearsOfExperience = yearsOfExperience?.toInt(),
    customersCount = customersCount.toInt(),
    workingDays = workingDays.map { it.toDomain() },
    services = services.map { StaffServiceRef(it.id, it.catalogServiceId, it.name, it.brideOnly) },
    reviews = ReviewsPreview(RatingSummary(reviews.avg.toFloat(), reviews.count.toInt()), reviews.latest.map { it.toDomain() }),
)

fun GetSalonsBySalonIdStaffByMemberIdDataWorkingDaysItem.toDomain(): WorkingDay {
    val open = start?.takeIf { it.isNotBlank() }
    val close = end?.takeIf { it.isNotBlank() }
    return WorkingDay(day = DayOfWeek.fromCode(day), hours = if (open != null && close != null) OpeningHours(open, close) else null)
}

fun GetSalonsBySalonIdStaffByMemberIdDataReviewsLatestItem.toDomain(): Review =
    Review(
        id = id,
        customerName = customerName,
        rating = rating.toFloat(),
        comment = comment,
        createdAt = createdAt,
        branch = branch?.let { BranchRef(it.id, it.name) },
    )
