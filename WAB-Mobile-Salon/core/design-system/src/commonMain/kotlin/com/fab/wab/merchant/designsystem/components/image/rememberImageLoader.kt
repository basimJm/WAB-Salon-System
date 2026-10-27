package com.fab.wab.merchant.designsystem.components.image

import androidx.compose.runtime.Composable
import androidx.compose.runtime.remember
import coil3.ImageLoader
import coil3.PlatformContext
import coil3.SingletonImageLoader
import coil3.compose.LocalPlatformContext
import coil3.svg.SvgDecoder

/**
 * The shared loader; it also decodes SVG (country flags of `GET /locations/countries` are `.svg`).
 * One process-wide instance (Coil's singleton, built on the application context), so every screen and the
 * booking-request overlay share one memory cache and one disk cache instead of each building its own.
 */
@Composable
fun rememberImageLoader(): ImageLoader {
    val context = LocalPlatformContext.current

    return remember(context) {
        SingletonImageLoader.setSafe(::newSharedImageLoader)
        SingletonImageLoader.get(context)
    }
}

internal fun newSharedImageLoader(context: PlatformContext): ImageLoader =
    ImageLoader.Builder(context)
        .components { add(SvgDecoder.Factory()) }
        .build()
