package com.fab.wab.merchant.feature.branches.presentation.screen

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.foundation.verticalScroll
import androidx.compose.material3.Icon
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.text.style.TextDirection
import androidx.compose.ui.window.Dialog
import androidx.compose.ui.window.DialogProperties
import com.fab.wab.merchant.core.analytics.compose.TrackScreen
import com.fab.wab.merchant.core.domain.branch.BranchField
import com.fab.wab.merchant.core.ui.map.MapProvider
import com.fab.wab.merchant.designsystem.components.button.AppButton
import com.fab.wab.merchant.designsystem.components.card.AppCard
import com.fab.wab.merchant.designsystem.components.feedback.AppErrorState
import com.fab.wab.merchant.designsystem.components.feedback.AppLoadingIndicator
import com.fab.wab.merchant.designsystem.components.layout.AppScreen
import com.fab.wab.merchant.designsystem.components.map.AppMapPicker
import com.fab.wab.merchant.designsystem.components.navigation.AppTopBar
import com.fab.wab.merchant.designsystem.components.text.AppText
import com.fab.wab.merchant.designsystem.components.textfield.AppDropdownField
import com.fab.wab.merchant.designsystem.components.textfield.AppTextField
import com.fab.wab.merchant.designsystem.icons.AppIcons
import com.fab.wab.merchant.designsystem.theme.AppTheme
import com.fab.wab.merchant.feature.branches.presentation.analytics.BranchesAnalytics
import com.fab.wab.merchant.feature.branches.presentation.controller.contract.BranchEditContract.UiAction
import com.fab.wab.merchant.feature.branches.presentation.controller.contract.BranchEditContract.UiState
import com.fab.wab.merchant.feature.branches.presentation.resources.Res
import com.fab.wab.merchant.feature.branches.presentation.resources.branch_address
import com.fab.wab.merchant.feature.branches.presentation.resources.branch_area
import com.fab.wab.merchant.feature.branches.presentation.resources.branch_change
import com.fab.wab.merchant.feature.branches.presentation.resources.branch_city
import com.fab.wab.merchant.feature.branches.presentation.resources.branch_create
import com.fab.wab.merchant.feature.branches.presentation.resources.branch_edit_title
import com.fab.wab.merchant.feature.branches.presentation.resources.branch_location
import com.fab.wab.merchant.feature.branches.presentation.resources.branch_location_error
import com.fab.wab.merchant.feature.branches.presentation.resources.branch_location_pick
import com.fab.wab.merchant.feature.branches.presentation.resources.branch_name_ar
import com.fab.wab.merchant.feature.branches.presentation.resources.branch_name_en
import com.fab.wab.merchant.feature.branches.presentation.resources.branch_name_hint
import com.fab.wab.merchant.feature.branches.presentation.resources.branch_new_title
import com.fab.wab.merchant.feature.branches.presentation.resources.branch_phone
import com.fab.wab.merchant.feature.branches.presentation.resources.branch_phone_error
import com.fab.wab.merchant.feature.branches.presentation.resources.branch_phone_hint
import com.fab.wab.merchant.feature.branches.presentation.resources.branch_required
import com.fab.wab.merchant.feature.branches.presentation.resources.branch_save
import com.fab.wab.merchant.feature.branches.presentation.resources.branch_whatsapp
import org.jetbrains.compose.resources.StringResource
import org.jetbrains.compose.resources.stringResource
import org.koin.compose.koinInject

/** Create / edit a branch (MER-062): names AR + EN, map pin + address, city / area, phone, optional WhatsApp. */
@Composable
fun BranchEditScreen(state: UiState, onAction: (UiAction) -> Unit, onBack: () -> Unit, modifier: Modifier = Modifier) {
    TrackScreen(BranchesAnalytics.SCREEN_BRANCH_EDIT)
    val title = if (state.isNew) Res.string.branch_new_title else Res.string.branch_edit_title
    AppScreen(
        modifier = modifier,
        topBar = { AppTopBar(title = stringResource(title), onBack = onBack) },
        bottomBar = {
            if (!state.loading && state.error == null) {
                AppButton(
                    text = stringResource(if (state.isNew) Res.string.branch_create else Res.string.branch_save),
                    onClick = { onAction(UiAction.OnSave) },
                    modifier = Modifier.fillMaxWidth().padding(horizontal = AppTheme.spacing.space16, vertical = AppTheme.spacing.space10),
                    enabled = state.canSave,
                    loading = state.saving,
                )
            }
        },
    ) { padding ->
        when {
            state.loading -> Box(Modifier.fillMaxSize(), contentAlignment = Alignment.Center) { AppLoadingIndicator() }
            state.error != null -> AppErrorState(onRetry = { onAction(UiAction.OnRetry) }, message = state.error)
            else -> Form(state, onAction, Modifier.padding(padding))
        }
    }
    MapOverlay(state, onAction)
}

@Composable
private fun Form(state: UiState, onAction: (UiAction) -> Unit, modifier: Modifier = Modifier) {
    val spacing = AppTheme.spacing
    val form = state.form
    val errors = state.visibleErrors
    Column(
        modifier = modifier.fillMaxSize().verticalScroll(rememberScrollState()).padding(spacing.space16),
        verticalArrangement = Arrangement.spacedBy(spacing.space14),
    ) {
        AppTextField(
            value = form.nameAr,
            onValueChange = { onAction(UiAction.OnNameAr(it)) },
            label = stringResource(Res.string.branch_name_ar),
            placeholder = stringResource(Res.string.branch_name_hint),
            textDirection = TextDirection.Rtl,
            error = errorText(BranchField.NAME_AR in errors, Res.string.branch_required),
        )
        AppTextField(
            value = form.nameEn,
            onValueChange = { onAction(UiAction.OnNameEn(it)) },
            label = stringResource(Res.string.branch_name_en),
            textDirection = TextDirection.Ltr,
            error = errorText(BranchField.NAME_EN in errors, Res.string.branch_required),
        )
        LocationCard(state, onAction)
        AppTextField(
            value = form.locationText,
            onValueChange = { onAction(UiAction.OnLocationText(it)) },
            label = stringResource(Res.string.branch_address),
            singleLine = false,
            error = errorText(BranchField.LOCATION_TEXT in errors, Res.string.branch_required),
        )
        CityArea(state, onAction)
        PhoneField(form.phone, Res.string.branch_phone, BranchField.PHONE in errors) { onAction(UiAction.OnPhone(it)) }
        PhoneField(form.whatsapp, Res.string.branch_whatsapp, BranchField.WHATSAPP in errors) { onAction(UiAction.OnWhatsapp(it)) }
    }
}

@Composable
private fun errorText(show: Boolean, message: StringResource): String? = if (show) stringResource(message) else null

@Composable
private fun PhoneField(value: String, label: StringResource, invalid: Boolean, onChange: (String) -> Unit) {
    AppTextField(
        value = value,
        onValueChange = onChange,
        label = stringResource(label),
        placeholder = stringResource(Res.string.branch_phone_hint),
        keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Phone),
        textDirection = TextDirection.Ltr,
        error = errorText(invalid, Res.string.branch_phone_error),
    )
}

@Composable
private fun LocationCard(state: UiState, onAction: (UiAction) -> Unit) {
    val missing = BranchField.LOCATION in state.visibleErrors
    val colors = AppTheme.colors
    AppCard(modifier = Modifier.fillMaxWidth(), onClick = { onAction(UiAction.OnOpenMap) }) {
        Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(AppTheme.spacing.space10)) {
            Icon(AppIcons.Location, contentDescription = null, tint = if (missing) colors.danger else colors.accent)
            Column(modifier = Modifier.weight(1f)) {
                AppText(text = stringResource(Res.string.branch_location), style = AppTheme.typography.labelLarge)
                val hint = when {
                    missing -> stringResource(Res.string.branch_location_error)
                    state.form.location == null -> stringResource(Res.string.branch_location_pick)
                    else -> state.form.locationText.ifBlank { stringResource(Res.string.branch_location_pick) }
                }
                AppText(text = hint, style = AppTheme.typography.bodySmall, color = if (missing) colors.danger else colors.muted)
            }
            AppText(text = stringResource(Res.string.branch_change), style = AppTheme.typography.labelLarge, color = colors.accent)
        }
    }
}

@Composable
private fun CityArea(state: UiState, onAction: (UiAction) -> Unit) {
    val form = state.form
    val errors = state.visibleErrors
    Row(horizontalArrangement = Arrangement.spacedBy(AppTheme.spacing.space10)) {
        AppDropdownField(
            options = state.cities.map { it.name },
            selectedIndex = state.cities.indexOfFirst { it.id == form.cityId }.takeIf { it >= 0 },
            onSelect = { onAction(UiAction.OnCity(it)) },
            placeholder = stringResource(Res.string.branch_city),
            label = stringResource(Res.string.branch_city),
            modifier = Modifier.weight(1f),
            error = errorText(BranchField.CITY in errors, Res.string.branch_required),
        )
        AppDropdownField(
            options = state.areas.map { it.name },
            selectedIndex = state.areas.indexOfFirst { it.id == form.areaId }.takeIf { it >= 0 },
            onSelect = { onAction(UiAction.OnArea(it)) },
            placeholder = stringResource(Res.string.branch_area),
            label = stringResource(Res.string.branch_area),
            modifier = Modifier.weight(1f),
            error = errorText(BranchField.AREA in errors, Res.string.branch_required),
            enabled = state.areas.isNotEmpty(),
        )
    }
}

@Composable
private fun MapOverlay(state: UiState, onAction: (UiAction) -> Unit) {
    val map = state.map ?: return
    Dialog(onDismissRequest = { onAction(UiAction.OnCloseMap) }, properties = DialogProperties(usePlatformDefaultWidth = false)) {
        AppScreen(
            topBar = { AppTopBar(title = stringResource(Res.string.branch_location), onBack = { onAction(UiAction.OnCloseMap) }) },
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
