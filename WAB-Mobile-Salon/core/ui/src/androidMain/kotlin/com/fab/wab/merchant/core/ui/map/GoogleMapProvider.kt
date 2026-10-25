package com.fab.wab.merchant.core.ui.map

import android.content.Context
import android.content.pm.PackageManager
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.rememberUpdatedState
import androidx.compose.ui.Modifier
import com.fab.wab.merchant.core.domain.location.MapDefaults
import com.fab.wab.merchant.core.domain.location.isSamePointAs
import com.fab.wab.merchant.core.domain.model.LocationData
import com.google.android.gms.maps.CameraUpdateFactory
import com.google.android.gms.maps.model.CameraPosition
import com.google.android.gms.maps.model.LatLng
import com.google.maps.android.compose.GoogleMap
import com.google.maps.android.compose.MapUiSettings
import com.google.maps.android.compose.rememberCameraPositionState
import org.koin.core.module.Module
import org.koin.dsl.module

/** Google Maps (maps-compose); the pin is drawn by the picker at the centre, the camera target is the point. */
class GoogleMapProvider : MapProvider {
    override val isAvailable: Boolean = true

    @Composable
    override fun Map(
        target: LocationData,
        onCenterChange: (LocationData) -> Unit,
        onMovingChange: (Boolean) -> Unit,
        modifier: Modifier,
    ) {
        val camera = rememberCameraPositionState {
            position = CameraPosition.fromLatLngZoom(target.toLatLng(), MapDefaults.DEFAULT_ZOOM)
        }
        val currentOnCenter by rememberUpdatedState(onCenterChange)
        val currentOnMoving by rememberUpdatedState(onMovingChange)
        LaunchedEffect(target) {
            val here = camera.position.target.toLocation()
            if (!here.isSamePointAs(target)) camera.animate(CameraUpdateFactory.newLatLng(target.toLatLng()))
        }
        LaunchedEffect(camera.isMoving) {
            currentOnMoving(camera.isMoving)
            if (!camera.isMoving) currentOnCenter(camera.position.target.toLocation())
        }
        GoogleMap(
            modifier = modifier,
            cameraPositionState = camera,
            uiSettings = MapUiSettings(zoomControlsEnabled = false, myLocationButtonEnabled = false, mapToolbarEnabled = false),
        )
    }
}

private fun LocationData.toLatLng() = LatLng(latitude, longitude)

private fun LatLng.toLocation() = LocationData(latitude, longitude)

/** The maps key comes from `local.properties` / CI (`MAPS_API_KEY` → manifest meta-data); blank = no Google map. */
private const val MAPS_KEY_META_DATA = "com.google.android.geo.API_KEY"

private fun hasMapsKey(context: Context): Boolean = try {
    val info = context.packageManager.getApplicationInfo(context.packageName, PackageManager.GET_META_DATA)
    !info.metaData?.getString(MAPS_KEY_META_DATA).isNullOrBlank()
} catch (ignored: PackageManager.NameNotFoundException) {
    false
}

actual val platformMapModule: Module = module {
    single<MapProvider> { if (hasMapsKey(get<Context>())) GoogleMapProvider() else NoMapProvider }
}
