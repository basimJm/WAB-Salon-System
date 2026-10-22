package com.fab.wab.merchant.designsystem.components.map

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.WindowInsets
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.navigationBars
import androidx.compose.foundation.layout.offset
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.statusBars
import androidx.compose.foundation.layout.windowInsetsPadding
import androidx.compose.material3.Icon
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.graphicsLayer
import androidx.compose.ui.semantics.Role
import androidx.compose.ui.text.font.FontWeight
import com.fab.wab.merchant.core.domain.model.LocationData
import com.fab.wab.merchant.core.ui.map.MapProvider
import com.fab.wab.merchant.designsystem.components.button.AppButton
import com.fab.wab.merchant.designsystem.components.button.ButtonKind
import com.fab.wab.merchant.designsystem.components.glass.glassBackground
import com.fab.wab.merchant.designsystem.components.glass.glassClickable
import com.fab.wab.merchant.designsystem.components.glass.rememberGlassPress
import com.fab.wab.merchant.designsystem.components.text.AppText
import com.fab.wab.merchant.designsystem.components.textfield.AppSearchBar
import com.fab.wab.merchant.designsystem.icons.AppIcons
import com.fab.wab.merchant.designsystem.resources.Res
import com.fab.wab.merchant.designsystem.resources.map_confirm
import com.fab.wab.merchant.designsystem.resources.map_pin
import com.fab.wab.merchant.designsystem.resources.map_pin_hint
import com.fab.wab.merchant.designsystem.resources.map_resolving
import com.fab.wab.merchant.designsystem.resources.map_search_hint
import com.fab.wab.merchant.designsystem.resources.map_unknown_address
import com.fab.wab.merchant.designsystem.resources.map_use_my_location
import com.fab.wab.merchant.designsystem.theme.AppTheme
import com.fab.wab.merchant.designsystem.theme.GlassStyle
import org.jetbrains.compose.resources.stringResource

private const val PIN_LIFT = 0.5f
private const val ADDRESS_MAX_LINES = 2

/**
 * Full-screen salon location picker (PRD M13, design 05 Salon `on.map`): the map moves under a fixed pin, the search
 * field suggests places, "Use my location" asks the host for the device position, the bottom card shows the
 * reverse-geocoded address and confirms. The platform map comes from [mapProvider]; without one the stylized map is
 * drawn instead.
 */
@Composable
fun AppMapPicker(
    state: MapPickerUi,
    mapProvider: MapProvider,
    onAction: (MapPickerAction) -> Unit,
    modifier: Modifier = Modifier,
) {
    var moving by remember { mutableStateOf(false) }
    Box(modifier = modifier.fillMaxSize()) {
        val onCenter = { point: LocationData -> onAction(MapPickerAction.CenterChanged(point)) }
        if (mapProvider.isAvailable) {
            mapProvider.Map(state.target, onCenter, { moving = it }, Modifier.fillMaxSize())
        } else {
            StylizedMap(state.target, onCenter, { moving = it }, Modifier.fillMaxSize())
        }
        CenterPin(lifted = moving, modifier = Modifier.align(Alignment.Center))
        SearchArea(state, onAction, Modifier.align(Alignment.TopCenter))
        Column(modifier = Modifier.align(Alignment.BottomCenter).fillMaxWidth()) {
            UseMyLocationButton(
                locating = state.locating,
                onClick = { onAction(MapPickerAction.UseMyLocation) },
                modifier = Modifier.align(Alignment.End).padding(AppTheme.spacing.space16),
            )
            AddressCard(state, onConfirm = { onAction(MapPickerAction.Confirm) })
        }
    }
}

@Composable
private fun CenterPin(lifted: Boolean, modifier: Modifier = Modifier) {
    val colors = AppTheme.colors
    val sizes = AppTheme.sizes
    Box(modifier = modifier, contentAlignment = Alignment.Center) {
        Box(Modifier.size(sizes.mapPinShadowWidth, sizes.mapPinShadowHeight).background(colors.scrim.copy(alpha = AppTheme.alpha.hover), AppTheme.shapes.pill))
        Icon(
            imageVector = AppIcons.Location,
            contentDescription = stringResource(Res.string.map_pin),
            tint = colors.accent,
            modifier = Modifier
                .size(sizes.mapPin)
                .offset(y = -sizes.mapPin * PIN_LIFT)
                .graphicsLayer { translationY = if (lifted) -sizes.mapPinShadowWidth.toPx() else 0f },
        )
    }
}

@Composable
private fun SearchArea(state: MapPickerUi, onAction: (MapPickerAction) -> Unit, modifier: Modifier = Modifier) {
    val spacing = AppTheme.spacing
    Column(
        modifier = modifier.fillMaxWidth().windowInsetsPadding(WindowInsets.statusBars).padding(horizontal = spacing.space16, vertical = spacing.space12),
        verticalArrangement = Arrangement.spacedBy(spacing.space6),
    ) {
        AppSearchBar(
            value = state.query,
            onValueChange = { onAction(MapPickerAction.QueryChanged(it)) },
            placeholder = stringResource(Res.string.map_search_hint),
        )
        if (state.suggestions.isNotEmpty()) {
            Column(modifier = Modifier.fillMaxWidth().glassBackground(AppTheme.glass, AppTheme.shapes.medium, GlassStyle.Prominent)) {
                state.suggestions.forEach { suggestion -> SuggestionRow(suggestion) { onAction(MapPickerAction.SuggestionPicked(suggestion.id)) } }
            }
        }
    }
}

@Composable
private fun SuggestionRow(suggestion: PlaceSuggestionUi, onClick: () -> Unit) {
    val press = rememberGlassPress()
    Column(
        modifier = Modifier
            .fillMaxWidth()
            .glassClickable(press, role = Role.Button, onClick = onClick)
            .padding(horizontal = AppTheme.spacing.space14, vertical = AppTheme.spacing.space10),
    ) {
        AppText(text = suggestion.title, style = AppTheme.typography.labelMedium.copy(fontWeight = FontWeight.Bold), maxLines = 1)
        if (suggestion.subtitle.isNotBlank()) {
            AppText(text = suggestion.subtitle, style = AppTheme.typography.bodySmall, color = AppTheme.colors.muted, maxLines = 1)
        }
    }
}

@Composable
private fun UseMyLocationButton(locating: Boolean, onClick: () -> Unit, modifier: Modifier = Modifier) {
    AppButton(
        text = stringResource(Res.string.map_use_my_location),
        onClick = onClick,
        kind = ButtonKind.Secondary,
        loading = locating,
        leadingIcon = AppIcons.Location,
        modifier = modifier,
    )
}

@Composable
private fun AddressCard(state: MapPickerUi, onConfirm: () -> Unit) {
    val colors = AppTheme.colors
    val spacing = AppTheme.spacing
    Column(
        modifier = Modifier
            .fillMaxWidth()
            .glassBackground(AppTheme.glass, AppTheme.shapes.sheet, GlassStyle.Prominent)
            .windowInsetsPadding(WindowInsets.navigationBars)
            .padding(horizontal = spacing.space20, vertical = spacing.space16),
        verticalArrangement = Arrangement.spacedBy(spacing.space6),
    ) {
        AppText(text = stringResource(Res.string.map_pin_hint), style = AppTheme.typography.bodySmall, color = colors.muted)
        val address = when {
            state.resolving -> stringResource(Res.string.map_resolving)
            else -> state.address ?: stringResource(Res.string.map_unknown_address)
        }
        AppText(text = address, style = AppTheme.typography.titleSmall.copy(fontWeight = FontWeight.Bold), maxLines = ADDRESS_MAX_LINES)
        val error = state.error
        if (!error.isNullOrBlank()) AppText(text = error, style = AppTheme.typography.bodySmall, color = colors.danger)
        AppButton(
            text = stringResource(Res.string.map_confirm),
            onClick = onConfirm,
            enabled = state.canConfirm,
            modifier = Modifier.fillMaxWidth().padding(top = spacing.space8),
        )
    }
}
