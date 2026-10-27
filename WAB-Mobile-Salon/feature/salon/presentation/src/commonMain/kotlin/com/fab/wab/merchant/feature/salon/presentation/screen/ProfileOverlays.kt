package com.fab.wab.merchant.feature.salon.presentation.screen

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.ColumnScope
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.aspectRatio
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.verticalScroll
import androidx.compose.material3.Icon
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.window.Dialog
import androidx.compose.ui.window.DialogProperties
import com.fab.wab.merchant.core.analytics.compose.TrackScreen
import com.fab.wab.merchant.core.ui.map.MapProvider
import com.fab.wab.merchant.designsystem.components.avatar.AppAvatar
import com.fab.wab.merchant.designsystem.components.button.AppButton
import com.fab.wab.merchant.designsystem.components.button.AppTextButton
import com.fab.wab.merchant.designsystem.components.button.ButtonKind
import com.fab.wab.merchant.designsystem.components.card.AppCard
import com.fab.wab.merchant.designsystem.components.dialog.AppBottomSheet
import com.fab.wab.merchant.designsystem.components.image.AppImage
import com.fab.wab.merchant.designsystem.components.image.AppImageFallback
import com.fab.wab.merchant.designsystem.components.layout.AppScreen
import com.fab.wab.merchant.designsystem.components.map.AppMapPicker
import com.fab.wab.merchant.designsystem.components.upload.AppMediaPicker
import com.fab.wab.merchant.designsystem.resources.map_open_in_maps
import com.fab.wab.merchant.designsystem.components.navigation.AppTopBar
import com.fab.wab.merchant.designsystem.components.text.AppText
import com.fab.wab.merchant.designsystem.components.textfield.AppTextField
import com.fab.wab.merchant.designsystem.components.upload.AppImageCropper
import com.fab.wab.merchant.designsystem.components.upload.CropAspect
import com.fab.wab.merchant.designsystem.icons.AppIcons
import com.fab.wab.merchant.designsystem.theme.AppTheme
import com.fab.wab.merchant.feature.salon.domain.ProfileField
import com.fab.wab.merchant.feature.salon.presentation.analytics.SalonAnalytics
import com.fab.wab.merchant.feature.salon.presentation.controller.contract.ProfileImage
import com.fab.wab.merchant.feature.salon.presentation.controller.contract.SalonProfileContract.UiAction
import com.fab.wab.merchant.feature.salon.presentation.controller.contract.SalonProfileContract.UiState
import com.fab.wab.merchant.feature.salon.presentation.resources.Res
import com.fab.wab.merchant.feature.salon.presentation.resources.profile_change
import com.fab.wab.merchant.feature.salon.presentation.resources.profile_close
import com.fab.wab.merchant.feature.salon.presentation.resources.profile_location
import com.fab.wab.merchant.feature.salon.presentation.resources.profile_location_error
import com.fab.wab.merchant.feature.salon.presentation.resources.profile_location_pick
import com.fab.wab.merchant.feature.salon.presentation.resources.profile_location_text
import com.fab.wab.merchant.feature.salon.presentation.resources.profile_preview_note
import com.fab.wab.merchant.feature.salon.presentation.resources.profile_preview_title
import com.fab.wab.merchant.feature.salon.presentation.resources.profile_rating
import com.fab.wab.merchant.feature.salon.presentation.resources.profile_too_long
import org.jetbrains.compose.resources.stringResource
import org.koin.compose.koinInject
import com.fab.wab.merchant.designsystem.resources.Res as DesignRes

@Composable
internal fun ColumnScope.LocationSection(state: UiState, onAction: (UiAction) -> Unit) {
    val form = state.form
    val spacing = AppTheme.spacing
    val missing = ProfileField.LOCATION in state.visibleErrors
    AppCard(modifier = Modifier.fillMaxWidth(), onClick = { onAction(UiAction.OnOpenMap) }) {
        Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(spacing.space10)) {
            Icon(AppIcons.Location, contentDescription = null, tint = if (missing) AppTheme.colors.danger else AppTheme.colors.accent)
            Column(modifier = Modifier.weight(1f)) {
                AppText(text = stringResource(Res.string.profile_location), style = AppTheme.typography.labelLarge)
                val hint = if (missing) stringResource(Res.string.profile_location_error) else form.locationText.ifBlank {
                    stringResource(Res.string.profile_location_pick)
                }
                AppText(
                    text = hint,
                    style = AppTheme.typography.bodySmall,
                    color = if (missing) AppTheme.colors.danger else AppTheme.colors.muted,
                )
            }
            AppText(
                text = stringResource(Res.string.profile_change),
                style = AppTheme.typography.labelLarge,
                color = AppTheme.colors.accent,
            )
        }
    }
    if (form.location != null) {
        AppTextButton(
            text = stringResource(DesignRes.string.map_open_in_maps),
            onClick = { onAction(UiAction.OnOpenInMaps) },
            modifier = Modifier.align(Alignment.End),
        )
    }
    AppTextField(
        value = form.locationText,
        onValueChange = { onAction(UiAction.OnLocationText(it)) },
        label = stringResource(Res.string.profile_location_text),
        singleLine = false,
        error = if (ProfileField.LOCATION_TEXT in state.visibleErrors) stringResource(Res.string.profile_too_long) else null,
    )
}

/** Crop sheet, full-screen map picker and the customer preview (design 05 `sh.crop`, `on.map`, `on.preview`). */
@Composable
internal fun ProfileOverlays(state: UiState, onAction: (UiAction) -> Unit) {
    AppMediaPicker(state.media) { onAction(UiAction.OnMedia(it)) }
    state.crop?.let { request ->
        AppBottomSheet(onDismiss = { onAction(UiAction.OnCropCancel) }) {
            AppImageCropper(
                bytes = request.bytes,
                aspect = if (request.target == ProfileImage.COVER) CropAspect.WIDE else CropAspect.SQUARE,
                onConfirm = { onAction(UiAction.OnCropConfirm(it)) },
                onCancel = { onAction(UiAction.OnCropCancel) },
                modifier = Modifier.padding(AppTheme.spacing.space16),
            )
        }
    }
    state.map?.let { map ->
        Dialog(onDismissRequest = { onAction(UiAction.OnCloseMap) }, properties = DialogProperties(usePlatformDefaultWidth = false)) {
            TrackScreen(SalonAnalytics.SCREEN_PROFILE_MAP)
            AppScreen(
                topBar = { AppTopBar(title = stringResource(Res.string.profile_location), onBack = { onAction(UiAction.OnCloseMap) }) },
            ) { padding ->
                AppMapPicker(
                    state = map,
                    mapProvider = koinInject<MapProvider>(),
                    onAction = { onAction(UiAction.OnMap(it)) },
                    modifier = Modifier.padding(padding),
                )
            }
        }
    }
    if (state.previewOpen) PreviewSheet(state, onAction)
}

@Composable
private fun PreviewSheet(state: UiState, onAction: (UiAction) -> Unit) {
    val form = state.form
    val salon = state.salon ?: return
    val spacing = AppTheme.spacing
    TrackScreen(SalonAnalytics.SCREEN_PROFILE_PREVIEW)
    AppBottomSheet(onDismiss = { onAction(UiAction.OnClosePreview) }) {
        Column(
            modifier = Modifier.fillMaxWidth().verticalScroll(rememberScrollState()).padding(spacing.space16),
            verticalArrangement = Arrangement.spacedBy(spacing.space10),
        ) {
            AppText(text = stringResource(Res.string.profile_preview_title), style = AppTheme.typography.titleMedium)
            AppText(
                text = stringResource(Res.string.profile_preview_note),
                style = AppTheme.typography.bodySmall,
                color = AppTheme.colors.muted,
            )
            val cover = state.cover?.preview?.bytes
            val coverUrl = form.coverUrl
            val shape = AppTheme.shapes.large
            Box(modifier = Modifier.fillMaxWidth().aspectRatio(CropAspect.WIDE.ratio).clip(shape)) {
                when {
                    cover != null -> AppImage(cover, Modifier.fillMaxSize())
                    coverUrl != null -> AppImage(coverUrl, Modifier.fillMaxSize())
                    else -> AppImageFallback(Modifier.fillMaxSize())
                }
            }
            Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(spacing.space10)) {
                AppAvatar(name = form.name, imageUrl = form.profileUrl)
                Column(modifier = Modifier.weight(1f)) {
                    AppText(text = form.name, style = AppTheme.typography.titleMedium.copy(fontWeight = FontWeight.Bold))
                    AppText(
                        text = stringResource(Res.string.profile_rating, ratingText(salon.ratingAverage), salon.ratingCount),
                        style = AppTheme.typography.bodySmall,
                        color = AppTheme.colors.muted,
                    )
                }
            }
            if (form.description.isNotBlank()) AppText(text = form.description, style = AppTheme.typography.bodyMedium)
            if (form.locationText.isNotBlank()) AppText(
                text = form.locationText,
                style = AppTheme.typography.bodySmall,
                color = AppTheme.colors.muted,
            )
            AppButton(
                stringResource(Res.string.profile_close),
                { onAction(UiAction.OnClosePreview) },
                Modifier.fillMaxWidth(),
                kind = ButtonKind.Outlined,
            )
        }
    }
}

/** One decimal, no trailing ".0" noise beyond it (4.8, 5.0). */
private fun ratingText(average: Double): String {
    val scaled = kotlin.math.round(average * RATING_SCALE).toLong()
    return "${scaled / RATING_SCALE.toLong()}.${scaled % RATING_SCALE.toLong()}"
}

private const val RATING_SCALE = 10.0
