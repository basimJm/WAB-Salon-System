package com.fab.wab.customer.designsystem.components.image

import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier
import androidx.compose.ui.layout.ContentScale
import coil3.compose.AsyncImage

@Composable
fun AppImage(modifier: Modifier = Modifier, url: String) {
    val imageLoader = LocalImageLoader.current

    AsyncImage(
        modifier = modifier,
        model = url,
        contentScale = ContentScale.Crop,
        imageLoader = imageLoader,
        contentDescription = null
    )
}
