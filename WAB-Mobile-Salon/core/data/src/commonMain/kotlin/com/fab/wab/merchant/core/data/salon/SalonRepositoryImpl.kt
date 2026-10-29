package com.fab.wab.merchant.core.data.salon

import com.fab.wab.merchant.core.data.contract.generated.GetSalonData
import com.fab.wab.merchant.core.domain.AppResult
import com.fab.wab.merchant.core.domain.mapSuccess
import com.fab.wab.merchant.core.domain.model.LocationData
import com.fab.wab.merchant.core.domain.salon.Audience
import com.fab.wab.merchant.core.domain.salon.BusinessType
import com.fab.wab.merchant.core.domain.salon.CompletenessItem
import com.fab.wab.merchant.core.domain.salon.SalonProfile
import com.fab.wab.merchant.core.domain.salon.SalonRepository
import com.fab.wab.merchant.core.domain.session.SalonState
import com.fab.wab.merchant.core.domain.session.SessionStore
import com.fab.wab.merchant.core.network.safeApiCall
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow

class SalonRepositoryImpl(private val api: SalonApi, private val sessionStore: SessionStore) : SalonRepository {
    private val state = MutableStateFlow<SalonProfile?>(null)

    override val current: StateFlow<SalonProfile?> = state.asStateFlow()

    override suspend fun refresh(): AppResult<SalonProfile> {
        val result = safeApiCall { api.current() }.mapSuccess { it.data.toDomain() }
        if (result is AppResult.Success) {
            state.value = result.data
            sessionStore.updateSalonState(result.data.state)
        }
        return result
    }
}

/** Unknown states read as pending review, unknown completeness keys are ignored; an unknown type/audience reads as a unisex salon. */
fun GetSalonData.toDomain() = SalonProfile(
    id = id,
    name = name,
    businessType = BusinessType.fromCode(businessType) ?: BusinessType.SALON,
    audience = Audience.fromCode(audience) ?: Audience.BOTH,
    state = SalonState.fromCode(state) ?: SalonState.APPLICATION_PENDING,
    description = description?.takeIf { it.isNotBlank() },
    coverUrl = coverUrl,
    profileUrl = profileUrl,
    coverKey = coverKey,
    profileKey = profileKey,
    location = location?.let { LocationData(it.latitude, it.longitude) },
    locationText = locationText?.takeIf { it.isNotBlank() },
    cityId = cityId,
    areaId = areaId,
    phone = phone?.takeIf { it.isNotBlank() },
    whatsapp = whatsapp?.takeIf { it.isNotBlank() },
    missing = completeness.missing.mapNotNull(CompletenessItem::fromCode).toSet(),
    ratingAverage = rating.avg,
    ratingCount = rating.count.toInt(),
)
