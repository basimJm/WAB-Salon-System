package com.fab.wab.merchant.designsystem.components.image

import androidx.compose.runtime.Composable
import androidx.compose.runtime.remember
import coil3.ImageLoader
import coil3.compose.LocalPlatformContext
import coil3.svg.SvgDecoder

/** The shared loader; it also decodes SVG (country flags of `GET /locations/countries` are `.svg`). */
@Composable
fun rememberImageLoader(): ImageLoader {
    val context = LocalPlatformContext.current

    return remember {
        ImageLoader.Builder(context)
            .components { add(SvgDecoder.Factory()) }
            .build()
    }
}
