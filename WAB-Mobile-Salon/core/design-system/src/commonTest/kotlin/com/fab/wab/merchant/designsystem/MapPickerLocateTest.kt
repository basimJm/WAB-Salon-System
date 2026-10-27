package com.fab.wab.merchant.designsystem

import com.fab.wab.merchant.core.domain.location.ReverseGeocoder
import com.fab.wab.merchant.core.domain.model.LocationData
import com.fab.wab.merchant.core.domain.model.PlacePrediction
import com.fab.wab.merchant.core.domain.provider.DeviceLocationProvider
import com.fab.wab.merchant.core.domain.repository.PlacesRepository
import com.fab.wab.merchant.core.ui.permission.AppPermission
import com.fab.wab.merchant.core.ui.permission.PermissionFlow
import com.fab.wab.merchant.core.ui.permission.PermissionManager
import com.fab.wab.merchant.core.ui.permission.PermissionStatus
import com.fab.wab.merchant.designsystem.components.map.LOCATE_TIMEOUT_MS
import com.fab.wab.merchant.designsystem.components.map.MapNotice
import com.fab.wab.merchant.designsystem.components.map.MapPickerAction
import com.fab.wab.merchant.designsystem.components.map.MapPickerController
import com.fab.wab.merchant.designsystem.components.map.MapPickerDependencies
import com.fab.wab.merchant.designsystem.components.map.MapPickerHandler
import com.fab.wab.merchant.designsystem.components.map.MapPickerUi
import kotlinx.coroutines.ExperimentalCoroutinesApi
import kotlinx.coroutines.awaitCancellation
import kotlinx.coroutines.test.StandardTestDispatcher
import kotlinx.coroutines.test.TestScope
import kotlinx.coroutines.test.advanceTimeBy
import kotlinx.coroutines.test.runCurrent
import kotlinx.coroutines.test.runTest
import kotlin.test.Test
import kotlin.test.assertEquals
import kotlin.test.assertFalse
import kotlin.test.assertNull

@OptIn(ExperimentalCoroutinesApi::class)
class MapPickerLocateTest {
    private val here = LocationData(32.0, 35.8)

    private class Permissions(var status: PermissionStatus, var servicesOn: Boolean = true) : PermissionManager {
        val opened = mutableListOf<String>()
        override suspend fun status(permission: AppPermission) = status
        override suspend fun request(permission: AppPermission) = status
        override fun openSettings(permission: AppPermission) { opened += "app" }
        override fun isLocationServiceEnabled() = servicesOn
        override fun openLocationServiceSettings() { opened += "services" }
    }

    private object NoPlaces : PlacesRepository {
        override suspend fun searchPlaces(query: String): List<PlacePrediction> = emptyList()
        override suspend fun fetchPlaceDetails(placeId: String): PlacePrediction? = null
    }

    private class Harness(scope: TestScope, val permissions: Permissions, location: suspend () -> LocationData?) {
        var map: MapPickerUi? = null
        val handler = MapPickerHandler(
            MapPickerController(
                MapPickerDependencies(
                    geocoder = ReverseGeocoder { _, _ -> "Mecca St" },
                    places = NoPlaces,
                    location = object : DeviceLocationProvider {
                        override suspend fun currentLocation(): LocationData? = location()
                    },
                    permissions = PermissionFlow(permissions),
                    language = { "en" },
                ),
            ),
            scope,
            { map },
            { map = it },
        )

        fun locate() {
            handler.open(LocationData(31.0, 35.0), "Old")
            handler.handle(MapPickerAction.UseMyLocation) { _, _ -> }
        }
    }

    @Test
    fun foundPositionMovesThePinWithoutNotice() = runTest(StandardTestDispatcher()) {
        val harness = Harness(this, Permissions(PermissionStatus.GRANTED)) { here }
        harness.locate()
        runCurrent()
        assertEquals(here, harness.map?.target)
        assertNull(harness.map?.notice)
        assertFalse(harness.map?.locating ?: true)
    }

    @Test
    fun everyRefusalIsExplainedWithItsWayOut() = runTest(StandardTestDispatcher()) {
        val permissions = Permissions(PermissionStatus.DENIED_PERMANENTLY)
        val harness = Harness(this, permissions) { here }
        harness.locate()
        runCurrent()
        assertEquals(MapNotice.BLOCKED, harness.map?.notice)
        harness.handler.handle(MapPickerAction.NoticeAction) { _, _ -> }
        assertEquals(listOf("app"), permissions.opened)
        assertNull(harness.map?.notice)

        permissions.status = PermissionStatus.GRANTED
        permissions.servicesOn = false
        harness.locate()
        runCurrent()
        assertEquals(MapNotice.SERVICES_OFF, harness.map?.notice)
        harness.handler.handle(MapPickerAction.NoticeAction) { _, _ -> }
        assertEquals(listOf("app", "services"), permissions.opened)

        permissions.status = PermissionStatus.DENIED
        harness.locate()
        runCurrent()
        assertEquals(MapNotice.DENIED, harness.map?.notice)
        harness.handler.handle(MapPickerAction.DismissNotice) { _, _ -> }
        assertNull(harness.map?.notice)
    }

    @Test
    fun noFixWithinTheTimeoutStopsSpinningAndSaysSo() = runTest(StandardTestDispatcher()) {
        val harness = Harness(this, Permissions(PermissionStatus.GRANTED)) { awaitCancellation() }
        harness.locate()
        runCurrent()
        assertEquals(true, harness.map?.locating)
        advanceTimeBy(LOCATE_TIMEOUT_MS + 1)
        runCurrent()
        assertEquals(MapNotice.NOT_FOUND, harness.map?.notice)
        assertFalse(harness.map?.locating ?: true)
        assertEquals(LocationData(31.0, 35.0), harness.map?.target)
    }
}
