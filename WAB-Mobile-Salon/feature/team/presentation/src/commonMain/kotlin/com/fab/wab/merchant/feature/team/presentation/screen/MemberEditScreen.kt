package com.fab.wab.merchant.feature.team.presentation.screen

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.verticalScroll
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import com.fab.wab.merchant.core.analytics.compose.TrackScreen
import com.fab.wab.merchant.core.domain.locations.Country
import com.fab.wab.merchant.core.ui.utils.LocalAppLocale
import com.fab.wab.merchant.designsystem.components.button.AppButton
import com.fab.wab.merchant.designsystem.components.button.ButtonKind
import com.fab.wab.merchant.designsystem.components.dialog.AppBottomSheet
import com.fab.wab.merchant.designsystem.components.feedback.AppErrorState
import com.fab.wab.merchant.designsystem.components.feedback.AppLoadingIndicator
import com.fab.wab.merchant.designsystem.components.form.AppCountryPicker
import com.fab.wab.merchant.designsystem.components.form.AppPhoneField
import com.fab.wab.merchant.designsystem.components.form.CountryUi
import com.fab.wab.merchant.designsystem.components.layout.AppScreen
import com.fab.wab.merchant.designsystem.components.navigation.AppTopBar
import com.fab.wab.merchant.designsystem.components.selector.AppSegmentedTabs
import com.fab.wab.merchant.designsystem.components.text.AppText
import com.fab.wab.merchant.designsystem.components.textfield.AppDropdownField
import com.fab.wab.merchant.designsystem.components.textfield.AppTextField
import com.fab.wab.merchant.designsystem.components.upload.AppImageCropper
import com.fab.wab.merchant.designsystem.components.upload.AppImageUploader
import com.fab.wab.merchant.designsystem.components.upload.CropAspect
import com.fab.wab.merchant.designsystem.theme.AppTheme
import com.fab.wab.merchant.feature.team.domain.ASSIGNABLE_ROLES
import com.fab.wab.merchant.feature.team.domain.MemberField
import com.fab.wab.merchant.feature.team.presentation.analytics.TeamAnalytics
import com.fab.wab.merchant.feature.team.presentation.controller.contract.MemberEditContract.UiAction
import com.fab.wab.merchant.feature.team.presentation.controller.contract.MemberEditContract.UiState
import com.fab.wab.merchant.feature.team.presentation.resources.Res
import com.fab.wab.merchant.feature.team.presentation.resources.member_branch
import com.fab.wab.merchant.feature.team.presentation.resources.member_branch_choose
import com.fab.wab.merchant.feature.team.presentation.resources.member_branch_move_note
import com.fab.wab.merchant.feature.team.presentation.resources.member_first
import com.fab.wab.merchant.feature.team.presentation.resources.member_info
import com.fab.wab.merchant.feature.team.presentation.resources.member_last
import com.fab.wab.merchant.feature.team.presentation.resources.member_move_conflict_body
import com.fab.wab.merchant.feature.team.presentation.resources.member_new
import com.fab.wab.merchant.feature.team.presentation.resources.member_permissions
import com.fab.wab.merchant.feature.team.presentation.resources.member_phone
import com.fab.wab.merchant.feature.team.presentation.resources.member_phone_error
import com.fab.wab.merchant.feature.team.presentation.resources.member_phone_hint
import com.fab.wab.merchant.feature.team.presentation.resources.member_phone_locked
import com.fab.wab.merchant.feature.team.presentation.resources.member_photo
import com.fab.wab.merchant.feature.team.presentation.resources.member_required
import com.fab.wab.merchant.feature.team.presentation.resources.member_role
import com.fab.wab.merchant.feature.team.presentation.resources.member_save
import com.fab.wab.merchant.feature.team.presentation.resources.member_staff_profile
import org.jetbrains.compose.resources.stringResource

/** PRD M17 member form (design 06 `on.memberForm`). [permissionsReady] / [staffReady] show the links once those screens ship. */
@Composable
fun MemberEditScreen(
    state: UiState,
    permissionsReady: Boolean,
    staffReady: Boolean,
    onAction: (UiAction) -> Unit,
    onBack: () -> Unit,
    modifier: Modifier = Modifier,
) {
    TrackScreen(TeamAnalytics.SCREEN_MEMBER)
    val spacing = AppTheme.spacing
    AppScreen(
        modifier = modifier,
        topBar = { AppTopBar(title = stringResource(if (state.isNew) Res.string.member_new else Res.string.member_info), onBack = onBack) },
        bottomBar = {
            if (!state.loading && state.error == null) {
                AppButton(
                    text = stringResource(Res.string.member_save),
                    onClick = { onAction(UiAction.OnSave) },
                    modifier = Modifier.fillMaxWidth().padding(horizontal = spacing.space16, vertical = spacing.space10),
                    enabled = state.canSave,
                    loading = state.saving,
                )
            }
        },
    ) { padding ->
        when {
            state.loading -> Box(Modifier.fillMaxSize(), contentAlignment = Alignment.Center) { AppLoadingIndicator() }
            state.error != null -> AppErrorState(onRetry = { onAction(UiAction.OnRetry) }, message = state.error)
            else -> Form(state, permissionsReady, staffReady, onAction, Modifier.padding(padding))
        }
    }
    Overlays(state, onAction)
}

@Composable
private fun Form(
    state: UiState,
    permissionsReady: Boolean,
    staffReady: Boolean,
    onAction: (UiAction) -> Unit,
    modifier: Modifier = Modifier,
) {
    val spacing = AppTheme.spacing
    val errors = state.visibleErrors
    val required = stringResource(Res.string.member_required)
    Column(
        modifier = modifier.fillMaxSize().verticalScroll(rememberScrollState()).padding(spacing.space16),
        verticalArrangement = Arrangement.spacedBy(spacing.space14),
    ) {
        AppText(text = stringResource(Res.string.member_photo), style = AppTheme.typography.labelLarge)
        AppImageUploader(
            item = state.photo,
            aspect = CropAspect.SQUARE,
            onPick = { onAction(UiAction.OnPickPhoto) },
            onRetry = { onAction(UiAction.OnPickPhoto) },
            modifier = Modifier.width(AppTheme.sizes.avatarLarge),
        )
        AppTextField(
            value = state.draft.firstName,
            onValueChange = { onAction(UiAction.OnFirstName(it)) },
            label = stringResource(Res.string.member_first),
            error = if (MemberField.FIRST_NAME in errors) required else null,
        )
        AppTextField(
            value = state.draft.lastName,
            onValueChange = { onAction(UiAction.OnLastName(it)) },
            label = stringResource(Res.string.member_last),
            error = if (MemberField.LAST_NAME in errors) required else null,
        )
        if (state.isNew) {
            AppPhoneField(
                value = state.draft.number,
                onValueChange = { onAction(UiAction.OnNumber(it)) },
                country = state.country?.toUi(),
                onCountryClick = { onAction(UiAction.OnCountryClick) },
                label = stringResource(Res.string.member_phone),
                error = if (MemberField.PHONE in errors) stringResource(Res.string.member_phone_error) else null,
            )
            AppText(
                text = stringResource(Res.string.member_phone_hint),
                style = AppTheme.typography.bodySmall,
                color = AppTheme.colors.muted,
            )
        } else {
            AppTextField(
                value = state.phone,
                onValueChange = {},
                label = stringResource(Res.string.member_phone),
                readOnly = true,
                enabled = false,
            )
            AppText(
                text = stringResource(Res.string.member_phone_locked),
                style = AppTheme.typography.labelSmall,
                color = AppTheme.colors.faint,
            )
        }
        AppText(text = stringResource(Res.string.member_role), style = AppTheme.typography.labelLarge)
        AppSegmentedTabs(
            tabs = ASSIGNABLE_ROLES.map { stringResource(it.label()) },
            selectedIndex = ASSIGNABLE_ROLES.indexOf(state.draft.role).coerceAtLeast(0),
            onSelect = { onAction(UiAction.OnRole(ASSIGNABLE_ROLES[it])) },
        )
        if (state.branches.isNotEmpty()) BranchField(state, onAction)
        if (!state.isNew && permissionsReady) {
            AppButton(
                stringResource(Res.string.member_permissions),
                { onAction(UiAction.OnPermissions) },
                Modifier.fillMaxWidth(),
                kind = ButtonKind.Outlined,
            )
        }
        if (!state.isNew && staffReady) {
            AppButton(
                stringResource(Res.string.member_staff_profile),
                { onAction(UiAction.OnStaffProfile) },
                Modifier.fillMaxWidth(),
                kind = ButtonKind.Outlined,
            )
        }
    }
}

@Composable
private fun Overlays(state: UiState, onAction: (UiAction) -> Unit) {
    if (state.countryPickerOpen) {
        AppCountryPicker(
            countries = state.countries.map { it.toUi() },
            selectedCode = state.draft.countryCode,
            onSelect = { onAction(UiAction.OnCountrySelect(it.code)) },
            onDismiss = { onAction(UiAction.OnCountryDismiss) },
        )
    }
    state.cropBytes?.let { bytes ->
        AppBottomSheet(onDismiss = { onAction(UiAction.OnCropCancel) }) {
            AppImageCropper(
                bytes = bytes,
                aspect = CropAspect.SQUARE,
                onConfirm = { onAction(UiAction.OnCropConfirm(it)) },
                onCancel = { onAction(UiAction.OnCropCancel) },
                modifier = Modifier.padding(AppTheme.spacing.space16),
            )
        }
    }
    if (state.moveConflict != null) {
        AffectedBookingsSheet(
            body = stringResource(Res.string.member_move_conflict_body),
            onReassign = { onAction(UiAction.OnConflictReassign) },
            onCancelBookings = { onAction(UiAction.OnConflictCancelBookings) },
            onBack = { onAction(UiAction.OnConflictDismiss) },
        )
    }
}

/** MER-065: every manager / employee belongs to one branch; changing it moves the member (their services stay behind). */
@Composable
private fun BranchField(state: UiState, onAction: (UiAction) -> Unit) {
    val language = LocalAppLocale.current
    AppDropdownField(
        options = state.branches.map { it.name.localized(language) },
        selectedIndex = state.branches.indexOfFirst { it.id == state.draft.branchId }.takeIf { it >= 0 },
        onSelect = { onAction(UiAction.OnBranch(it)) },
        placeholder = stringResource(Res.string.member_branch_choose),
        label = stringResource(Res.string.member_branch),
        error = if (MemberField.BRANCH in state.visibleErrors) stringResource(Res.string.member_required) else null,
    )
    if (!state.isNew && state.draft.branchId != state.original.branchId) {
        AppText(
            text = stringResource(Res.string.member_branch_move_note),
            style = AppTheme.typography.labelSmall,
            color = AppTheme.colors.muted,
        )
    }
}

internal fun Country.toUi(): CountryUi = CountryUi(
    code = code,
    name = name,
    dialCode = dialCode,
    flagUrl = flagUrl,
    phoneRegex = phoneRegex,
)
