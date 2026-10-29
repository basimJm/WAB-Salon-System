package com.fab.wab.merchant.feature.salon.presentation

import com.fab.wab.merchant.core.domain.AppResult
import com.fab.wab.merchant.core.domain.locations.Area
import com.fab.wab.merchant.core.domain.locations.City
import com.fab.wab.merchant.core.domain.locations.Country
import com.fab.wab.merchant.core.domain.locations.LocationsRepository
import com.fab.wab.merchant.core.domain.model.LocationData
import com.fab.wab.merchant.core.domain.model.PlacePrediction
import com.fab.wab.merchant.core.domain.provider.DeviceLocationProvider
import com.fab.wab.merchant.core.domain.repository.PlacesRepository
import com.fab.wab.merchant.core.domain.salon.CompletenessItem
import com.fab.wab.merchant.core.domain.salon.Audience
import com.fab.wab.merchant.core.domain.salon.BusinessType
import com.fab.wab.merchant.core.domain.salon.SalonProfile
import com.fab.wab.merchant.core.domain.salon.SalonRepository
import com.fab.wab.merchant.core.domain.session.SalonState
import com.fab.wab.merchant.core.domain.upload.ConfirmedUpload
import com.fab.wab.merchant.core.domain.upload.PresignedUpload
import com.fab.wab.merchant.core.domain.upload.UploadPurpose
import com.fab.wab.merchant.core.domain.upload.UploadsRepository
import com.fab.wab.merchant.core.ui.permission.AppPermission
import com.fab.wab.merchant.core.ui.permission.PermissionManager
import com.fab.wab.merchant.core.ui.permission.PermissionStatus
import com.fab.wab.merchant.feature.salon.domain.ProfileChanges
import com.fab.wab.merchant.feature.salon.domain.SalonProfileRepository
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow

internal fun salon(
    missing: Set<CompletenessItem> = emptySet(),
    type: BusinessType = BusinessType.SALON,
    audience: Audience = Audience.FEMALE,
) = SalonProfile(
    id = "s1", name = "Lina", businessType = type, audience = audience,
    state = SalonState.APPROVED_INCOMPLETE, description = "Old",
    coverUrl = "https://cdn/cover.jpg", profileUrl = null, coverKey = "salons/s1/cover.jpg", location = LocationData(31.9, 35.9),
    locationText = "Abdoun", cityId = "c1", areaId = "a1", phone = "+962791234567", whatsapp = null, missing = missing,
    ratingAverage = 4.8, ratingCount = 12,
)

internal class FakeSalon(var result: AppResult<SalonProfile>) : SalonRepository {
    val state = MutableStateFlow<SalonProfile?>(null)
    var refreshes = 0
    override val current: StateFlow<SalonProfile?> = state
    override suspend fun refresh(): AppResult<SalonProfile> {
        refreshes += 1
        (result as? AppResult.Success)?.let { state.value = it.data }
        return result
    }
}

internal class FakeProfiles(var result: AppResult<SalonProfile> = AppResult.Success(salon())) : SalonProfileRepository {
    val sent = mutableListOf<ProfileChanges>()
    override suspend fun update(changes: ProfileChanges): AppResult<SalonProfile> {
        sent += changes
        return result
    }

    var widenResult: AppResult<SalonProfile> = AppResult.Success(salon())
    var widened = 0
    override suspend fun widenAudience(): AppResult<SalonProfile> {
        widened++
        return widenResult
    }
}

internal class FakeLocations : LocationsRepository {
    override suspend fun countries(refresh: Boolean): AppResult<List<Country>> = AppResult.Success(emptyList())
    override suspend fun cities(countryCode: String, refresh: Boolean): AppResult<List<City>> =
        AppResult.Success(listOf(City("c1", "Amman"), City("c2", "Irbid")))
    override suspend fun areas(
        cityId: String,
        refresh: Boolean,
    ): AppResult<List<Area>> = AppResult.Success(listOf(Area("a-$cityId", "Area $cityId")))
}

internal class FakeUploads(var fail: Boolean = false) : UploadsRepository {
    override suspend fun presign(purpose: UploadPurpose, contentType: String, size: Long): AppResult<PresignedUpload> =
        AppResult.Success(PresignedUpload("${purpose.name}-key", "u", "PUT", emptyMap(), size))
    override suspend fun upload(
        target: PresignedUpload,
        bytes: ByteArray,
        contentType: String,
        onProgress: (Float) -> Unit,
    ): AppResult<Unit> =
        if (fail) AppResult.Error(com.fab.wab.merchant.core.domain.AppError.NetworkError("offline")) else AppResult.Success(Unit)
    override suspend fun confirm(
        purpose: UploadPurpose,
        key: String,
    ): AppResult<ConfirmedUpload> = AppResult.Success(ConfirmedUpload(key, "https://cdn/$key"))
}

internal class FakePlaces : PlacesRepository {
    override suspend fun searchPlaces(query: String): List<PlacePrediction> = listOf(PlacePrediction("p1", "Mall", "Amman"))
    override suspend fun fetchPlaceDetails(placeId: String): PlacePrediction? = PlacePrediction(
        placeId,
        "Mall",
        "Amman",
        PLACE_LAT,
        PLACE_LNG,
    )
}

internal const val PLACE_LAT = 31.97
internal const val PLACE_LNG = 35.85

internal class FakeDeviceLocation(var point: LocationData? = LocationData(32.0, 35.8)) : DeviceLocationProvider {
    override suspend fun currentLocation(): LocationData? = point
}

internal class FakePermissions(var status: PermissionStatus = PermissionStatus.GRANTED) : PermissionManager {
    override suspend fun status(permission: AppPermission): PermissionStatus = status
    override suspend fun request(permission: AppPermission): PermissionStatus = status
    override fun openSettings(permission: AppPermission) = Unit
    override fun isLocationServiceEnabled(): Boolean = true
    override fun openLocationServiceSettings() = Unit
}
