package com.fab.wab.merchant.feature.salon.presentation.screen

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.foundation.verticalScroll
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.text.style.TextDirection
import androidx.navigationevent.NavigationEventInfo
import androidx.navigationevent.compose.NavigationBackHandler
import androidx.navigationevent.compose.rememberNavigationEventState
import com.fab.wab.merchant.core.analytics.compose.TrackScreen
import com.fab.wab.merchant.core.domain.salon.SalonGenderType
import com.fab.wab.merchant.designsystem.components.button.AppButton
import com.fab.wab.merchant.designsystem.components.button.ButtonKind
import com.fab.wab.merchant.designsystem.components.card.AppCard
import com.fab.wab.merchant.designsystem.components.dialog.AppDialog
import com.fab.wab.merchant.designsystem.components.feedback.AppErrorState
import com.fab.wab.merchant.designsystem.components.feedback.AppLoadingIndicator
import com.fab.wab.merchant.designsystem.components.layout.AppScreen
import com.fab.wab.merchant.designsystem.components.navigation.AppTopBar
import com.fab.wab.merchant.designsystem.components.text.AppText
import com.fab.wab.merchant.designsystem.components.textfield.AppDropdownField
import com.fab.wab.merchant.designsystem.components.textfield.AppTextField
import com.fab.wab.merchant.designsystem.components.upload.AppImageUploader
import com.fab.wab.merchant.designsystem.components.upload.CropAspect
import com.fab.wab.merchant.designsystem.theme.AppTheme
import com.fab.wab.merchant.feature.salon.domain.ProfileField
import com.fab.wab.merchant.feature.salon.domain.ProfileLimits
import com.fab.wab.merchant.feature.salon.presentation.analytics.SalonAnalytics
import com.fab.wab.merchant.feature.salon.presentation.controller.contract.ProfileImage
import com.fab.wab.merchant.feature.salon.presentation.controller.contract.SalonProfileContract.UiAction
import com.fab.wab.merchant.feature.salon.presentation.controller.contract.SalonProfileContract.UiState
import com.fab.wab.merchant.feature.salon.presentation.resources.Res
import com.fab.wab.merchant.feature.salon.presentation.resources.hub_men
import com.fab.wab.merchant.feature.salon.presentation.resources.hub_women
import com.fab.wab.merchant.feature.salon.presentation.resources.profile_area
import com.fab.wab.merchant.feature.salon.presentation.resources.profile_city
import com.fab.wab.merchant.feature.salon.presentation.resources.profile_count
import com.fab.wab.merchant.feature.salon.presentation.resources.profile_cover_hint
import com.fab.wab.merchant.feature.salon.presentation.resources.profile_description
import com.fab.wab.merchant.feature.salon.presentation.resources.profile_discard
import com.fab.wab.merchant.feature.salon.presentation.resources.profile_locked
import com.fab.wab.merchant.feature.salon.presentation.resources.profile_logo_hint
import com.fab.wab.merchant.feature.salon.presentation.resources.profile_name
import com.fab.wab.merchant.feature.salon.presentation.resources.profile_phone
import com.fab.wab.merchant.feature.salon.presentation.resources.profile_phone_error
import com.fab.wab.merchant.feature.salon.presentation.resources.profile_phone_hint
import com.fab.wab.merchant.feature.salon.presentation.resources.profile_preview
import com.fab.wab.merchant.feature.salon.presentation.resources.profile_required
import com.fab.wab.merchant.feature.salon.presentation.resources.profile_save
import com.fab.wab.merchant.feature.salon.presentation.resources.profile_title
import com.fab.wab.merchant.feature.salon.presentation.resources.profile_too_long
import com.fab.wab.merchant.feature.salon.presentation.resources.profile_type
import com.fab.wab.merchant.feature.salon.presentation.resources.profile_unsaved_body
import com.fab.wab.merchant.feature.salon.presentation.resources.profile_unsaved_title
import com.fab.wab.merchant.feature.salon.presentation.resources.profile_whatsapp
import org.jetbrains.compose.resources.stringResource

/** PRD M13 (design 05 `on.profile`): images, name, description, location, city / area, phone, WhatsApp, type. */
@Composable
fun SalonProfileScreen(state: UiState, onAction: (UiAction) -> Unit, modifier: Modifier = Modifier) {
    TrackScreen(SalonAnalytics.SCREEN_PROFILE)
    NavigationBackHandler(
        state = rememberNavigationEventState(NavigationEventInfo.None),
        isBackEnabled = state.dirty && state.map == null && state.crop == null && !state.previewOpen,
        onBackCompleted = { onAction(UiAction.OnBack) },
    )
    AppScreen(
        modifier = modifier,
        topBar = { AppTopBar(title = stringResource(Res.string.profile_title), onBack = { onAction(UiAction.OnBack) }) },
        bottomBar = { if (!state.loading && state.salon != null) SaveBar(state, onAction) },
    ) { padding ->
        when {
            state.loading -> Box(Modifier.fillMaxSize(), contentAlignment = Alignment.Center) { AppLoadingIndicator() }
            state.salon == null -> AppErrorState(onRetry = { onAction(UiAction.OnRetry) }, message = state.error)
            else -> Form(state, onAction, Modifier.padding(padding))
        }
    }
    ProfileOverlays(state, onAction)
    if (state.unsavedDialog) {
        AppDialog(
            title = stringResource(Res.string.profile_unsaved_title),
            confirmText = stringResource(Res.string.profile_save),
            onConfirm = { onAction(UiAction.OnSaveAndLeave) },
            onDismiss = { onAction(UiAction.OnDiscard) },
            message = stringResource(Res.string.profile_unsaved_body),
            dismissText = stringResource(Res.string.profile_discard),
            dismissOnOutside = false,
        )
    }
}

@Composable
private fun Form(state: UiState, onAction: (UiAction) -> Unit, modifier: Modifier) {
    val spacing = AppTheme.spacing
    val form = state.form
    val errors = state.visibleErrors
    Column(
        modifier = modifier.fillMaxSize().verticalScroll(rememberScrollState()).padding(spacing.space16),
        verticalArrangement = Arrangement.spacedBy(spacing.space14),
    ) {
        Images(state, onAction)
        AppTextField(
            value = form.name,
            onValueChange = { onAction(UiAction.OnName(it)) },
            label = stringResource(Res.string.profile_name),
            error = if (ProfileField.NAME in errors) stringResource(Res.string.profile_required) else null,
        )
        AppTextField(
            value = form.description,
            onValueChange = { onAction(UiAction.OnDescription(it)) },
            label = stringResource(Res.string.profile_description),
            singleLine = false,
            error = if (ProfileField.DESCRIPTION in errors) stringResource(Res.string.profile_too_long) else null,
        )
        AppText(
            text = stringResource(Res.string.profile_count, form.description.length, ProfileLimits.DESCRIPTION_MAX),
            style = AppTheme.typography.labelSmall,
            color = AppTheme.colors.muted,
            modifier = Modifier.align(Alignment.End),
        )
        LocationSection(state, onAction)
        CityArea(state, onAction)
        AppTextField(
            value = form.phone,
            onValueChange = { onAction(UiAction.OnPhone(it)) },
            label = stringResource(Res.string.profile_phone),
            placeholder = stringResource(Res.string.profile_phone_hint),
            keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Phone),
            textDirection = TextDirection.Ltr,
            error = if (ProfileField.PHONE in errors) stringResource(Res.string.profile_phone_error) else null,
        )
        AppTextField(
            value = form.whatsapp,
            onValueChange = { onAction(UiAction.OnWhatsapp(it)) },
            label = stringResource(Res.string.profile_whatsapp),
            placeholder = stringResource(Res.string.profile_phone_hint),
            keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Phone),
            textDirection = TextDirection.Ltr,
            error = if (ProfileField.WHATSAPP in errors) stringResource(Res.string.profile_phone_error) else null,
        )
        SalonType(state)
        AppButton(
            text = stringResource(Res.string.profile_preview),
            onClick = { onAction(UiAction.OnPreview) },
            modifier = Modifier.fillMaxWidth(),
            kind = ButtonKind.Outlined,
        )
    }
}

@Composable
private fun Images(state: UiState, onAction: (UiAction) -> Unit) {
    val spacing = AppTheme.spacing
    Column(verticalArrangement = Arrangement.spacedBy(spacing.space10)) {
        AppImageUploader(
            item = state.cover,
            aspect = CropAspect.WIDE,
            onPick = { onAction(UiAction.OnPickImage(ProfileImage.COVER)) },
            onRetry = { onAction(UiAction.OnRetryImage(ProfileImage.COVER)) },
            hint = stringResource(Res.string.profile_cover_hint),
        )
        Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(spacing.space12)) {
            AppImageUploader(
                item = state.profile,
                aspect = CropAspect.SQUARE,
                onPick = { onAction(UiAction.OnPickImage(ProfileImage.PROFILE)) },
                onRetry = { onAction(UiAction.OnRetryImage(ProfileImage.PROFILE)) },
                modifier = Modifier.width(AppTheme.sizes.avatarLarge),
                hint = stringResource(Res.string.profile_logo_hint),
            )
        }
    }
}

@Composable
private fun CityArea(state: UiState, onAction: (UiAction) -> Unit) {
    val form = state.form
    Row(horizontalArrangement = Arrangement.spacedBy(AppTheme.spacing.space10)) {
        AppDropdownField(
            options = state.cities.map { it.name },
            selectedIndex = state.cities.indexOfFirst { it.id == form.cityId }.takeIf { it >= 0 },
            onSelect = { onAction(UiAction.OnCity(it)) },
            placeholder = stringResource(Res.string.profile_city),
            label = stringResource(Res.string.profile_city),
            modifier = Modifier.weight(1f),
        )
        AppDropdownField(
            options = state.areas.map { it.name },
            selectedIndex = state.areas.indexOfFirst { it.id == form.areaId }.takeIf { it >= 0 },
            onSelect = { onAction(UiAction.OnArea(it)) },
            placeholder = stringResource(Res.string.profile_area),
            label = stringResource(Res.string.profile_area),
            modifier = Modifier.weight(1f),
            enabled = state.areas.isNotEmpty(),
        )
    }
}

@Composable
private fun SalonType(state: UiState) {
    val female = state.salon?.gender == SalonGenderType.FEMALE
    AppCard(modifier = Modifier.fillMaxWidth()) {
        Column(verticalArrangement = Arrangement.spacedBy(AppTheme.spacing.space4)) {
            AppText(text = stringResource(Res.string.profile_type), style = AppTheme.typography.labelMedium, color = AppTheme.colors.muted)
            AppText(text = stringResource(if (female) Res.string.hub_women else Res.string.hub_men), style = AppTheme.typography.bodyMedium)
            AppText(text = stringResource(Res.string.profile_locked), style = AppTheme.typography.labelSmall, color = AppTheme.colors.faint)
        }
    }
}

@Composable
private fun SaveBar(state: UiState, onAction: (UiAction) -> Unit) {
    AppButton(
        text = stringResource(Res.string.profile_save),
        onClick = { onAction(UiAction.OnSave) },
        modifier = Modifier.fillMaxWidth().padding(horizontal = AppTheme.spacing.space16, vertical = AppTheme.spacing.space10),
        enabled = state.canSave,
        loading = state.saving,
    )
}
