package com.fab.wab.merchant.core.ui.map

import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberUpdatedState
import androidx.compose.ui.Modifier
import androidx.compose.ui.viewinterop.UIKitView
import com.fab.wab.merchant.core.domain.location.isSamePointAs
import com.fab.wab.merchant.core.domain.model.LocationData
import kotlinx.cinterop.ExperimentalForeignApi
import kotlinx.cinterop.ObjCSignatureOverride
import kotlinx.cinterop.useContents
import org.koin.core.module.Module
import org.koin.dsl.module
import platform.CoreLocation.CLLocationCoordinate2DMake
import platform.MapKit.MKCoordinateRegionMakeWithDistance
import platform.MapKit.MKMapView
import platform.MapKit.MKMapViewDelegateProtocol
import platform.darwin.NSObject

/** Visible span around the point when the picker opens (metres), close to Google's street zoom. */
private const val SPAN_METERS = 400.0

/** MapKit (no key needed); the pin is drawn by the picker at the centre. */
@OptIn(ExperimentalForeignApi::class)
class MapKitProvider : MapProvider {
    override val isAvailable: Boolean = true

    @Composable
    override fun Map(
        target: LocationData,
        onCenterChange: (LocationData) -> Unit,
        onMovingChange: (Boolean) -> Unit,
        modifier: Modifier,
    ) {
        val currentOnCenter by rememberUpdatedState(onCenterChange)
        val currentOnMoving by rememberUpdatedState(onMovingChange)
        val delegate = remember { RegionDelegate() }
        delegate.onMoving = { currentOnMoving(it) }
        delegate.onCenter = { currentOnCenter(it) }
        UIKitView(
            factory = {
                MKMapView().apply {
                    this.delegate = delegate
                    val center = CLLocationCoordinate2DMake(target.latitude, target.longitude)
                    setRegion(MKCoordinateRegionMakeWithDistance(center, SPAN_METERS, SPAN_METERS), animated = false)
                }
            },
            modifier = modifier,
            update = { view ->
                val here = view.centerCoordinate.useContents { LocationData(latitude, longitude) }
                if (!here.isSamePointAs(target)) {
                    view.setCenterCoordinate(CLLocationCoordinate2DMake(target.latitude, target.longitude), animated = true)
                }
            },
        )
    }
}

@OptIn(ExperimentalForeignApi::class)
private class RegionDelegate : NSObject(), MKMapViewDelegateProtocol {
    var onMoving: (Boolean) -> Unit = {}
    var onCenter: (LocationData) -> Unit = {}

    @ObjCSignatureOverride
    override fun mapView(mapView: MKMapView, regionWillChangeAnimated: Boolean) {
        onMoving(true)
    }

    @ObjCSignatureOverride
    override fun mapView(mapView: MKMapView, regionDidChangeAnimated: Boolean) {
        onMoving(false)
        onCenter(mapView.centerCoordinate.useContents { LocationData(latitude, longitude) })
    }
}

actual val platformMapModule: Module = module {
    single<MapProvider> { MapKitProvider() }
}
