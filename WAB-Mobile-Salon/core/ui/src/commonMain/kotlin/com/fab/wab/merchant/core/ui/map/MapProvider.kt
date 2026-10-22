package com.fab.wab.merchant.core.ui.map

import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier
import com.fab.wab.merchant.core.domain.model.LocationData
import org.koin.core.module.Module
import org.koin.dsl.module

/**
 * Interactive map behind a port (PRD M13 map picker): Google Maps on Android when a maps key is configured, MapKit on
 * iOS, [NoMapProvider] otherwise (the picker then draws its own stylized map). [target] moves the camera when it
 * differs from where the map already is; the map reports where the user left it through [onCenterChanged].
 */
interface MapProvider {
    val isAvailable: Boolean

    @Composable
    fun Map(
        target: LocationData,
        onCenterChanged: (LocationData) -> Unit,
        onMovingChanged: (Boolean) -> Unit,
        modifier: Modifier,
    )
}

/** No platform map (missing key, previews, tests). */
object NoMapProvider : MapProvider {
    override val isAvailable: Boolean = false

    @Composable
    override fun Map(
        target: LocationData,
        onCenterChanged: (LocationData) -> Unit,
        onMovingChanged: (Boolean) -> Unit,
        modifier: Modifier,
    ) = Unit
}

/** Binds the platform [MapProvider]. */
expect val platformMapModule: Module

val mapModule = module { includes(platformMapModule) }
