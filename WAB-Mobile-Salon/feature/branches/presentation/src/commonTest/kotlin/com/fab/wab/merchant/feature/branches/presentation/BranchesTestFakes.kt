package com.fab.wab.merchant.feature.branches.presentation

import com.fab.wab.merchant.core.domain.AppError
import com.fab.wab.merchant.core.domain.AppResult
import com.fab.wab.merchant.core.domain.branch.Branch
import com.fab.wab.merchant.core.domain.branch.BranchForm
import com.fab.wab.merchant.core.domain.branch.BranchName
import com.fab.wab.merchant.core.domain.branch.BranchStatus
import com.fab.wab.merchant.core.domain.branch.BranchesRepository
import com.fab.wab.merchant.core.domain.location.ReverseGeocoder
import com.fab.wab.merchant.core.domain.locations.Area
import com.fab.wab.merchant.core.domain.locations.City
import com.fab.wab.merchant.core.domain.locations.Country
import com.fab.wab.merchant.core.domain.locations.LocationsRepository
import com.fab.wab.merchant.core.domain.model.LocationData
import com.fab.wab.merchant.core.domain.model.PlacePrediction
import com.fab.wab.merchant.core.domain.provider.DeviceLocationProvider
import com.fab.wab.merchant.core.domain.repository.PlacesRepository
import com.fab.wab.merchant.core.ui.permission.AppPermission
import com.fab.wab.merchant.core.ui.permission.PermissionFlow
import com.fab.wab.merchant.core.ui.permission.PermissionManager
import com.fab.wab.merchant.core.ui.permission.PermissionStatus
import com.fab.wab.merchant.designsystem.components.map.MapPickerController
import com.fab.wab.merchant.designsystem.components.map.MapPickerDependencies
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow

internal fun branch(id: String, main: Boolean = false, status: BranchStatus = BranchStatus.ACTIVE) = Branch(
    id = id, name = BranchName("فرع $id", "Branch $id"), isMain = main, status = status, location = LocationData(31.9, 35.8),
    locationText = "St", cityId = "c1", areaId = "a1", phone = "+962791111111", whatsapp = null, offlineReason = null,
    missing = emptyList(),
)

internal class FakeBranches(initial: List<Branch> = listOf(branch("a", main = true), branch("b"))) : BranchesRepository {
    private val state = MutableStateFlow(initial)
    override val branches: StateFlow<List<Branch>> = state
    var refreshResult: AppResult<List<Branch>>? = null
    var failure: AppError? = null
    val calls = mutableListOf<String>()
    var saved: BranchForm? = null

    override suspend fun refresh(): AppResult<List<Branch>> = refreshResult ?: AppResult.Success(state.value)

    override suspend fun create(form: BranchForm): AppResult<Branch> = record("create") {
        saved = form
        branch("new").copy(name = BranchName(form.nameAr, form.nameEn))
    }

    override suspend fun update(id: String, form: BranchForm): AppResult<Branch> = record("update:$id") {
        saved = form
        branch(id).copy(name = BranchName(form.nameAr, form.nameEn))
    }

    override suspend fun setMain(id: String) = record("main:$id") { branch(id, main = true) }
    override suspend fun setOffline(id: String, reason: String) = record("offline:$id:$reason") { branch(id, status = BranchStatus.OFFLINE) }
    override suspend fun setOnline(id: String) = record("online:$id") { branch(id) }
    override suspend fun close(id: String) = record("close:$id") { branch(id, status = BranchStatus.CLOSED) }

    private fun record(call: String, result: () -> Branch): AppResult<Branch> {
        calls += call
        return failure?.let { AppResult.Error(it) } ?: AppResult.Success(result())
    }
}

internal class FakeLocations : LocationsRepository {
    override suspend fun countries(refresh: Boolean): AppResult<List<Country>> = AppResult.Success(emptyList())
    override suspend fun cities(countryCode: String, refresh: Boolean): AppResult<List<City>> =
        AppResult.Success(listOf(City("c1", "Amman"), City("c2", "Irbid")))
    override suspend fun areas(cityId: String, refresh: Boolean): AppResult<List<Area>> = AppResult.Success(listOf(Area("a-$cityId", "Area")))
}

private class GrantedPermissions : PermissionManager {
    override suspend fun status(permission: AppPermission): PermissionStatus = PermissionStatus.GRANTED
    override suspend fun request(permission: AppPermission): PermissionStatus = PermissionStatus.GRANTED
    override fun openSettings(permission: AppPermission) = Unit
    override fun isLocationServiceEnabled(): Boolean = true
    override fun openLocationServiceSettings() = Unit
}

private class NoPlaces : PlacesRepository {
    override suspend fun searchPlaces(query: String): List<PlacePrediction> = emptyList()
    override suspend fun fetchPlaceDetails(placeId: String): PlacePrediction? = null
}

internal fun fakeMap() = MapPickerController(
    MapPickerDependencies(
        geocoder = ReverseGeocoder { _, _ -> "Mecca St" },
        places = NoPlaces(),
        location = object : DeviceLocationProvider {
            override fun fetchCurrentLocation(onResult: (LocationData?) -> Unit) = onResult(LocationData(32.0, 35.8))
        },
        permissions = PermissionFlow(GrantedPermissions()),
        language = { "ar" },
    ),
)
