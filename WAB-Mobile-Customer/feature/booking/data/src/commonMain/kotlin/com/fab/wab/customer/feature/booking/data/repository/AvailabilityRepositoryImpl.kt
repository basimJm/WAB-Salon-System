package com.fab.wab.customer.feature.booking.data.repository

import com.fab.wab.customer.core.data.contract.generated.PostSalonsBySalonIdAvailabilityBody
import com.fab.wab.customer.core.data.contract.generated.PostSalonsBySalonIdAvailabilityBodyOthersItem
import com.fab.wab.customer.core.data.contract.generated.PostSalonsBySalonIdAvailabilityBodyPerson
import com.fab.wab.customer.core.data.contract.generated.PostSalonsBySalonIdAvailabilityData
import com.fab.wab.customer.core.domain.AppResult
import com.fab.wab.customer.core.domain.mapSuccess
import com.fab.wab.customer.core.network.safeApiCall
import com.fab.wab.customer.feature.booking.data.remote.AvailabilityApi
import com.fab.wab.customer.feature.booking.domain.model.AvailabilitySlot
import com.fab.wab.customer.feature.booking.domain.model.DayAvailability
import com.fab.wab.customer.feature.booking.domain.model.DraftPerson
import com.fab.wab.customer.feature.booking.domain.model.NoSlotsReason
import com.fab.wab.customer.feature.booking.domain.model.StaffChoice
import com.fab.wab.customer.feature.booking.domain.repository.AvailabilityRepository

class AvailabilityRepositoryImpl(private val api: AvailabilityApi) : AvailabilityRepository {
    override suspend fun slots(
        salonId: String,
        branchId: String?,
        date: String,
        person: DraftPerson,
        others: List<DraftPerson>,
        draftId: String?,
    ): AppResult<DayAvailability> = safeApiCall { api.slots(salonId, availabilityBodyOf(date, person, others, draftId, branchId)) }
        .mapSuccess { it.data.toDomain() }
}

/** Other persons count only when they picked a specific staff member (an "any" pick is resolved by the server). */
fun availabilityBodyOf(
    date: String,
    person: DraftPerson,
    others: List<DraftPerson>,
    draftId: String?,
    branchId: String? = null,
): PostSalonsBySalonIdAvailabilityBody = PostSalonsBySalonIdAvailabilityBody(
    branchId = branchId,
    date = date,
    person = PostSalonsBySalonIdAvailabilityBodyPerson(
        serviceIds = person.serviceIds,
        isBride = person.isBride,
        staffId = (person.staff as? StaffChoice.Specific)?.staffId,
    ),
    others = others.mapNotNull { other ->
        (other.staff as? StaffChoice.Specific)?.let { PostSalonsBySalonIdAvailabilityBodyOthersItem(it.staffId, other.start, null) }
    }.takeIf { it.isNotEmpty() },
    draftId = draftId,
)

fun PostSalonsBySalonIdAvailabilityData.toDomain(): DayAvailability = DayAvailability(
    date = date,
    reason = NoSlotsReason.fromCode(reason),
    durationMinutes = durationMinutes.toInt(),
    slots = slots.map { AvailabilitySlot(it.start, it.end, it.available, it.eligibleStaffIds) },
)
