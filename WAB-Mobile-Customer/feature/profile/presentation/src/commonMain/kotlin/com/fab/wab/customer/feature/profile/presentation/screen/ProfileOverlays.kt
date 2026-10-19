package com.fab.wab.customer.feature.profile.presentation.screen

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier
import com.fab.wab.customer.core.domain.AppLanguage
import com.fab.wab.customer.core.domain.ThemeMode
import com.fab.wab.customer.core.domain.session.Gender
import com.fab.wab.customer.core.ui.media.ImageSource
import com.fab.wab.customer.designsystem.components.button.AppPrimaryButton
import com.fab.wab.customer.designsystem.components.card.AppChoiceCard
import com.fab.wab.customer.designsystem.components.control.AppRadioButton
import com.fab.wab.customer.designsystem.components.dialog.AppBottomSheet
import com.fab.wab.customer.designsystem.components.dialog.AppGlobalDialog
import com.fab.wab.customer.designsystem.components.dialog.GlobalDialogKind
import com.fab.wab.customer.designsystem.components.text.AppText
import com.fab.wab.customer.designsystem.components.textfield.AppTextField
import com.fab.wab.customer.designsystem.icons.AppIcons
import com.fab.wab.customer.designsystem.theme.AppTheme
import com.fab.wab.customer.feature.profile.presentation.controller.contract.ContactChannel
import com.fab.wab.customer.feature.profile.presentation.controller.contract.ProfileContract.UiAction
import com.fab.wab.customer.feature.profile.presentation.controller.contract.ProfileContract.UiState
import com.fab.wab.customer.feature.profile.presentation.controller.contract.ProfileOverlay
import com.fab.wab.customer.feature.profile.presentation.resources.Res
import com.fab.wab.customer.feature.profile.presentation.resources.profile_contact
import com.fab.wab.customer.feature.profile.presentation.resources.profile_contact_call
import com.fab.wab.customer.feature.profile.presentation.resources.profile_contact_email
import com.fab.wab.customer.feature.profile.presentation.resources.profile_contact_whatsapp
import com.fab.wab.customer.feature.profile.presentation.resources.profile_edit_title
import com.fab.wab.customer.feature.profile.presentation.resources.profile_gender_female
import com.fab.wab.customer.feature.profile.presentation.resources.profile_gender_male
import com.fab.wab.customer.feature.profile.presentation.resources.profile_language
import com.fab.wab.customer.feature.profile.presentation.resources.profile_nickname_label
import com.fab.wab.customer.feature.profile.presentation.resources.profile_photo_camera
import com.fab.wab.customer.feature.profile.presentation.resources.profile_photo_change
import com.fab.wab.customer.feature.profile.presentation.resources.profile_photo_delete
import com.fab.wab.customer.feature.profile.presentation.resources.profile_photo_gallery
import com.fab.wab.customer.feature.profile.presentation.resources.profile_save
import com.fab.wab.customer.feature.profile.presentation.resources.profile_theme
import org.jetbrains.compose.resources.stringResource

/** The one active sheet / dialog of S21 (Design Script frames). */
@Composable
internal fun ProfileOverlays(state: UiState, onAction: (UiAction) -> Unit) {
    val dismiss = { onAction(UiAction.OnOverlayDismiss) }
    when (val overlay = state.overlay) {
        null -> Unit
        is ProfileOverlay.EditGuest -> EditGuestSheet(overlay, onAction)
        ProfileOverlay.PhotoOptions -> OptionsSheet(stringResource(Res.string.profile_photo_change), dismiss) {
            ProfileRow(AppIcons.Camera, stringResource(Res.string.profile_photo_camera), onClick = { onAction(UiAction.OnPhotoSourceSelect(ImageSource.CAMERA)) })
            ProfileRow(AppIcons.Gallery, stringResource(Res.string.profile_photo_gallery), onClick = { onAction(UiAction.OnPhotoSourceSelect(ImageSource.GALLERY)) }, divider = state.hasPhoto)
            if (state.hasPhoto) ProfileRow(AppIcons.Delete, stringResource(Res.string.profile_photo_delete), onClick = { onAction(UiAction.OnPhotoDelete) }, danger = true, divider = false)
        }
        ProfileOverlay.LanguagePicker -> OptionsSheet(stringResource(Res.string.profile_language), dismiss) {
            AppLanguage.entries.forEach { language ->
                RadioRow(language.label(), selected = language == state.language) { onAction(UiAction.OnLanguageSelect(language)) }
            }
        }
        ProfileOverlay.ThemePicker -> OptionsSheet(stringResource(Res.string.profile_theme), dismiss) {
            ThemeMode.entries.forEach { mode ->
                RadioRow(mode.label(), selected = mode == state.themeMode) { onAction(UiAction.OnThemeSelect(mode)) }
            }
        }
        ProfileOverlay.ContactUs -> OptionsSheet(stringResource(Res.string.profile_contact), dismiss) {
            ProfileRow(AppIcons.Call, stringResource(Res.string.profile_contact_call), onClick = { onAction(UiAction.OnContactChannel(ContactChannel.CALL)) })
            ProfileRow(AppIcons.Chat, stringResource(Res.string.profile_contact_whatsapp), onClick = { onAction(UiAction.OnContactChannel(ContactChannel.WHATSAPP)) })
            ProfileRow(AppIcons.Email, stringResource(Res.string.profile_contact_email), onClick = { onAction(UiAction.OnContactChannel(ContactChannel.EMAIL)) }, divider = false)
        }
        ProfileOverlay.LogoutConfirm -> AppGlobalDialog(GlobalDialogKind.Logout, onConfirm = { onAction(UiAction.OnLogoutConfirm) }, onDismiss = dismiss)
        ProfileOverlay.DeleteAccountConfirm ->
            AppGlobalDialog(GlobalDialogKind.DeleteAccount, onConfirm = { onAction(UiAction.OnDeleteAccountConfirm) }, onDismiss = dismiss)
    }
}

@Composable
private fun OptionsSheet(title: String, onDismiss: () -> Unit, content: @Composable () -> Unit) {
    val spacing = AppTheme.spacing
    AppBottomSheet(onDismiss = onDismiss) {
        Column(modifier = Modifier.fillMaxWidth().padding(bottom = spacing.space16)) {
            AppText(text = title, style = AppTheme.typography.titleMedium, modifier = Modifier.padding(spacing.space16))
            content()
        }
    }
}

@Composable
private fun RadioRow(label: String, selected: Boolean, onClick: () -> Unit) {
    val spacing = AppTheme.spacing
    Row(
        modifier = Modifier.fillMaxWidth().padding(horizontal = spacing.space16, vertical = spacing.space8),
        horizontalArrangement = Arrangement.spacedBy(spacing.space12),
    ) {
        AppRadioButton(selected = selected, onClick = onClick)
        AppText(text = label, modifier = Modifier.weight(1f))
    }
}

@Composable
private fun EditGuestSheet(draft: ProfileOverlay.EditGuest, onAction: (UiAction) -> Unit) {
    val spacing = AppTheme.spacing
    AppBottomSheet(onDismiss = { onAction(UiAction.OnOverlayDismiss) }) {
        Column(modifier = Modifier.fillMaxWidth().padding(spacing.space16), verticalArrangement = Arrangement.spacedBy(spacing.space12)) {
            AppText(text = stringResource(Res.string.profile_edit_title), style = AppTheme.typography.titleMedium)
            AppTextField(
                value = draft.nickname,
                onValueChange = { onAction(UiAction.OnGuestNicknameChange(it)) },
                modifier = Modifier.fillMaxWidth(),
                label = stringResource(Res.string.profile_nickname_label),
            )
            Row(horizontalArrangement = Arrangement.spacedBy(spacing.space12)) {
                AppChoiceCard(
                    label = stringResource(Res.string.profile_gender_male),
                    selected = draft.gender == Gender.MALE,
                    onClick = { onAction(UiAction.OnGuestGenderSelect(Gender.MALE)) },
                    modifier = Modifier.weight(1f),
                    icon = AppIcons.Man,
                )
                AppChoiceCard(
                    label = stringResource(Res.string.profile_gender_female),
                    selected = draft.gender == Gender.FEMALE,
                    onClick = { onAction(UiAction.OnGuestGenderSelect(Gender.FEMALE)) },
                    modifier = Modifier.weight(1f),
                    icon = AppIcons.Woman,
                )
            }
            AppPrimaryButton(
                text = stringResource(Res.string.profile_save),
                onClick = { onAction(UiAction.OnGuestSave) },
                modifier = Modifier.fillMaxWidth(),
                enabled = draft.canSave,
            )
        }
    }
}
