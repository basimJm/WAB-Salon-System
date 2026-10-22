package com.fab.wab.merchant.feature.salon.data

import com.fab.wab.merchant.core.domain.AppResult
import com.fab.wab.merchant.core.domain.salon.SalonProfile
import com.fab.wab.merchant.core.domain.salon.SalonRepository
import com.fab.wab.merchant.core.network.safeApiCall
import com.fab.wab.merchant.feature.salon.domain.Change
import com.fab.wab.merchant.feature.salon.domain.ProfileChanges
import com.fab.wab.merchant.feature.salon.domain.SalonProfileRepository
import kotlinx.serialization.json.JsonNull
import kotlinx.serialization.json.JsonObject
import kotlinx.serialization.json.JsonObjectBuilder
import kotlinx.serialization.json.JsonPrimitive
import kotlinx.serialization.json.buildJsonObject
import kotlinx.serialization.json.put

/** `PATCH /salon/profile` field names (contract). */
internal object ProfileKeys {
    const val NAME = "name"
    const val DESCRIPTION = "description"
    const val COVER_KEY = "coverKey"
    const val PROFILE_KEY = "profileKey"
    const val LOCATION = "location"
    const val LATITUDE = "latitude"
    const val LONGITUDE = "longitude"
    const val LOCATION_TEXT = "locationText"
    const val CITY_ID = "cityId"
    const val AREA_ID = "areaId"
    const val PHONE = "phone"
    const val WHATSAPP = "whatsapp"
}

fun ProfileChanges.toBody(): JsonObject = buildJsonObject {
    name?.let { put(ProfileKeys.NAME, it) }
    description?.let { putChange(ProfileKeys.DESCRIPTION, it) }
    coverKey?.let { put(ProfileKeys.COVER_KEY, it) }
    profileKey?.let { put(ProfileKeys.PROFILE_KEY, it) }
    location?.let { point ->
        put(ProfileKeys.LOCATION, buildJsonObject {
            put(ProfileKeys.LATITUDE, point.latitude)
            put(ProfileKeys.LONGITUDE, point.longitude)
        })
    }
    locationText?.let { putChange(ProfileKeys.LOCATION_TEXT, it) }
    cityId?.let { put(ProfileKeys.CITY_ID, it) }
    areaId?.let { put(ProfileKeys.AREA_ID, it) }
    phone?.let { put(ProfileKeys.PHONE, it) }
    whatsapp?.let { putChange(ProfileKeys.WHATSAPP, it) }
}

private fun JsonObjectBuilder.putChange(key: String, change: Change<String?>) {
    put(key, change.value?.let(::JsonPrimitive) ?: JsonNull)
}

class SalonProfileRepositoryImpl(
    private val api: SalonProfileApi,
    private val salon: SalonRepository,
) : SalonProfileRepository {
    override suspend fun update(changes: ProfileChanges): AppResult<SalonProfile> =
        when (val result = safeApiCall { api.update(changes.toBody()) }) {
            is AppResult.Success -> salon.refresh()
            is AppResult.Error -> result
            AppResult.Loading -> AppResult.Loading
        }
}
