package com.fab.wab.merchant.designsystem.preview

import androidx.compose.runtime.Composable
import androidx.compose.runtime.CompositionLocalProvider
import androidx.compose.ui.platform.LocalLayoutDirection
import androidx.compose.ui.tooling.preview.Preview
import androidx.compose.ui.unit.LayoutDirection
import com.fab.wab.merchant.core.domain.location.MapDefaults
import com.fab.wab.merchant.core.ui.map.NoMapProvider
import com.fab.wab.merchant.designsystem.components.map.AppMapPicker
import com.fab.wab.merchant.designsystem.components.map.MapPickerUi
import com.fab.wab.merchant.designsystem.components.map.PlaceSuggestionUi
import com.fab.wab.merchant.designsystem.theme.AppTheme

private val Picked = MapPickerUi(target = MapDefaults.DEFAULT_CENTER, address = "شارع الرينبو، جبل عمّان، عمّان")

@Composable
private fun MapFrame(state: MapPickerUi, dark: Boolean, rtl: Boolean) {
    val direction = if (rtl) LayoutDirection.Rtl else LayoutDirection.Ltr
    CompositionLocalProvider(LocalLayoutDirection provides direction) {
        AppTheme(darkTheme = dark) { AppMapPicker(state = state, mapProvider = NoMapProvider, onAction = {}) }
    }
}

@Preview(widthDp = 390, heightDp = 844)
@Composable
private fun MapPickerLightRtlPreview() = MapFrame(Picked, dark = false, rtl = true)

@Preview(widthDp = 390, heightDp = 844)
@Composable
private fun MapPickerDarkSearchPreview() = MapFrame(
    Picked.copy(query = "Rainbow", suggestions = listOf(PlaceSuggestionUi("p1", "Rainbow Street", "Amman"))),
    dark = true,
    rtl = false,
)

@Preview(widthDp = 390, heightDp = 844)
@Composable
private fun MapPickerResolvingPreview() = MapFrame(Picked.copy(address = null, resolving = true), dark = false, rtl = true)
