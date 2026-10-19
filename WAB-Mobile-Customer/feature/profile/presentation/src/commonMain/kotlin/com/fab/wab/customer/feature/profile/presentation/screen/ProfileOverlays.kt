package com.fab.wab.customer.feature.profile.presentation.screen

import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.text.BasicTextField
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.SolidColor
import androidx.compose.ui.semantics.Role
import androidx.compose.ui.text.font.FontWeight
import com.fab.wab.customer.core.domain.AppLanguage
import com.fab.wab.customer.core.domain.ThemeMode
import com.fab.wab.customer.core.domain.config.ContactInfo
import com.fab.wab.customer.core.domain.session.Gender
import com.fab.wab.customer.core.ui.media.ImageSource
import com.fab.wab.customer.designsystem.components.text.AppText
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
import com.fab.wab.customer.feature.profile.presentation.resources.profile_contact_row
import com.fab.wab.customer.feature.profile.presentation.resources.profile_contact_whatsapp
import com.fab.wab.customer.feature.profile.presentation.resources.profile_delete_body
import com.fab.wab.customer.feature.profile.presentation.resources.profile_delete_confirm
import com.fab.wab.customer.feature.profile.presentation.resources.profile_delete_title
import com.fab.wab.customer.feature.profile.presentation.resources.profile_edit_title
import com.fab.wab.customer.feature.profile.presentation.resources.profile_gender_female
import com.fab.wab.customer.feature.profile.presentation.resources.profile_gender_male
import com.fab.wab.customer.feature.profile.presentation.resources.profile_language
import com.fab.wab.customer.feature.profile.presentation.resources.profile_logout
import com.fab.wab.customer.feature.profile.presentation.resources.profile_logout_body
import com.fab.wab.customer.feature.profile.presentation.resources.profile_logout_title
import com.fab.wab.customer.feature.profile.presentation.resources.profile_nickname_label
import com.fab.wab.customer.feature.profile.presentation.resources.profile_photo_camera
import com.fab.wab.customer.feature.profile.presentation.resources.profile_photo_change
import com.fab.wab.customer.feature.profile.presentation.resources.profile_photo_delete
import com.fab.wab.customer.feature.profile.presentation.resources.profile_photo_gallery
import com.fab.wab.customer.feature.profile.presentation.resources.profile_save
import com.fab.wab.customer.feature.profile.presentation.resources.profile_theme
import org.jetbrains.compose.resources.stringResource

/** The one active sheet / dialog of S21 (design frames: nick, photo, language, theme, contact, logout, delete). */
@Composable
internal fun ProfileOverlays(state: UiState, onAction: (UiAction) -> Unit) {
    val dismiss = { onAction(UiAction.OnOverlayDismiss) }
    when (val overlay = state.overlay) {
        null -> Unit
        is ProfileOverlay.EditGuest -> EditGuestSheet(overlay, onAction)
        ProfileOverlay.PhotoOptions -> ProfileSheet(stringResource(Res.string.profile_photo_change), dismiss) {
            OptionRow(AppIcons.Camera, stringResource(Res.string.profile_photo_camera), { onAction(UiAction.OnPhotoSourceSelect(ImageSource.CAMERA)) })
            OptionRow(
                AppIcons.Gallery,
                stringResource(Res.string.profile_photo_gallery),
                { onAction(UiAction.OnPhotoSourceSelect(ImageSource.GALLERY)) },
                divider = state.hasPhoto,
            )
            if (state.hasPhoto) {
                OptionRow(
                    AppIcons.Delete,
                    stringResource(Res.string.profile_photo_delete),
                    { onAction(UiAction.OnPhotoDelete) },
                    danger = true,
                    divider = false,
                )
            }
        }
        ProfileOverlay.LanguagePicker -> ProfileSheet(stringResource(Res.string.profile_language), dismiss) {
            AppLanguage.entries.forEachIndexed { index, language ->
                OptionRow(
                    AppIcons.Language,
                    language.label(),
                    { onAction(UiAction.OnLanguageSelect(language)) },
                    selected = language == state.language,
                    divider = index < AppLanguage.entries.lastIndex,
                )
            }
        }
        ProfileOverlay.ThemePicker -> ProfileSheet(stringResource(Res.string.profile_theme), dismiss) {
            ThemeMode.entries.forEachIndexed { index, mode ->
                OptionRow(
                    mode.icon(),
                    mode.label(),
                    { onAction(UiAction.OnThemeSelect(mode)) },
                    selected = mode == state.themeMode,
                    divider = index < ThemeMode.entries.lastIndex,
                )
            }
        }
        ProfileOverlay.ContactUs -> ContactSheet(state.contact, onAction, dismiss)
        ProfileOverlay.LogoutConfirm -> ProfileDangerDialog(
            title = stringResource(Res.string.profile_logout_title),
            body = stringResource(Res.string.profile_logout_body),
            confirmText = stringResource(Res.string.profile_logout),
            onConfirm = { onAction(UiAction.OnLogoutConfirm) },
            onDismiss = dismiss,
        )
        ProfileOverlay.DeleteAccountConfirm -> ProfileDangerDialog(
            title = stringResource(Res.string.profile_delete_title),
            body = stringResource(Res.string.profile_delete_body),
            confirmText = stringResource(Res.string.profile_delete_confirm),
            onConfirm = { onAction(UiAction.OnDeleteAccountConfirm) },
            onDismiss = dismiss,
        )
    }
}

private fun ThemeMode.icon() = when (this) {
    ThemeMode.LIGHT -> AppIcons.ThemeLight
    ThemeMode.DARK -> AppIcons.ThemeDark
    ThemeMode.SYSTEM -> AppIcons.Maintenance
}

/** "Call · 06 555 0100" style rows from the app config; the config values are shown next to the channel label. */
@Composable
private fun ContactSheet(contact: ContactInfo?, onAction: (UiAction) -> Unit, onDismiss: () -> Unit) {
    ProfileSheet(stringResource(Res.string.profile_contact), onDismiss) {
        OptionRow(
            AppIcons.Call,
            contactLabel(stringResource(Res.string.profile_contact_call), contact?.phone),
            { onAction(UiAction.OnContactChannel(ContactChannel.CALL)) },
        )
        OptionRow(
            AppIcons.Chat,
            contactLabel(stringResource(Res.string.profile_contact_whatsapp), contact?.whatsapp),
            { onAction(UiAction.OnContactChannel(ContactChannel.WHATSAPP)) },
        )
        OptionRow(
            AppIcons.Email,
            contactLabel(stringResource(Res.string.profile_contact_email), contact?.email),
            { onAction(UiAction.OnContactChannel(ContactChannel.EMAIL)) },
            divider = false,
        )
    }
}

@Composable
private fun contactLabel(channel: String, value: String?): String =
    if (value.isNullOrBlank()) channel else stringResource(Res.string.profile_contact_row, channel, value)

/** Nickname sheet: accent label, 52 px field, two 48 px gender buttons (soft + violet border when selected), Save. */
@Composable
private fun EditGuestSheet(draft: ProfileOverlay.EditGuest, onAction: (UiAction) -> Unit) {
    val colors = AppTheme.colors
    ProfileSheet(stringResource(Res.string.profile_edit_title), onDismiss = { onAction(UiAction.OnOverlayDismiss) }) {
        AppText(
            text = stringResource(Res.string.profile_nickname_label),
            style = AppTheme.typography.labelMedium.copy(fontSize = ProfileDesign.nickLabelSize, fontWeight = FontWeight.SemiBold),
            color = colors.accent,
            modifier = Modifier.padding(bottom = ProfileDesign.nickLabelBottom),
        )
        NicknameField(draft.nickname, onValueChange = { onAction(UiAction.OnGuestNicknameChange(it)) })
        Row(
            modifier = Modifier.fillMaxWidth().padding(bottom = ProfileDesign.genderBottom),
            horizontalArrangement = Arrangement.spacedBy(ProfileDesign.genderGap),
        ) {
            GenderButton(stringResource(Res.string.profile_gender_male), draft.gender == Gender.MALE, Modifier.weight(1f)) {
                onAction(UiAction.OnGuestGenderSelect(Gender.MALE))
            }
            GenderButton(stringResource(Res.string.profile_gender_female), draft.gender == Gender.FEMALE, Modifier.weight(1f)) {
                onAction(UiAction.OnGuestGenderSelect(Gender.FEMALE))
            }
        }
        GradientButton(
            text = stringResource(Res.string.profile_save),
            onClick = { onAction(UiAction.OnGuestSave) },
            modifier = Modifier.fillMaxWidth(),
            enabled = draft.canSave,
        )
    }
}

@Composable
private fun NicknameField(value: String, onValueChange: (String) -> Unit) {
    val colors = AppTheme.colors
    val shape = AppTheme.shapes.medium
    BasicTextField(
        value = value,
        onValueChange = onValueChange,
        modifier = Modifier.fillMaxWidth().padding(bottom = ProfileDesign.nickFieldBottom),
        textStyle = AppTheme.typography.bodyLarge.copy(fontSize = ProfileDesign.nickFieldTextSize, color = colors.ink),
        singleLine = true,
        cursorBrush = SolidColor(colors.accent),
        decorationBox = { inner ->
            Box(
                modifier = Modifier
                    .fillMaxWidth()
                    .height(AppTheme.sizes.fieldHeight)
                    .background(colors.card, shape)
                    .border(AppTheme.sizes.borderWidth, colors.line, shape)
                    .padding(horizontal = AppTheme.spacing.space14),
                contentAlignment = Alignment.CenterStart,
            ) { inner() }
        },
    )
}

@Composable
private fun GenderButton(label: String, selected: Boolean, modifier: Modifier = Modifier, onClick: () -> Unit) {
    val colors = AppTheme.colors
    val shape = AppTheme.shapes.medium
    Box(
        modifier = modifier
            .height(ProfileDesign.genderHeight)
            .clip(shape)
            .background(if (selected) colors.soft else colors.card)
            .border(AppTheme.sizes.borderWidth, if (selected) colors.gradientEnd else colors.line, shape)
            .clickable(role = Role.RadioButton, onClick = onClick),
        contentAlignment = Alignment.Center,
    ) {
        AppText(
            text = label,
            style = AppTheme.typography.labelLarge.copy(fontSize = ProfileDesign.genderTextSize, fontWeight = FontWeight.SemiBold),
            color = if (selected) colors.accent else colors.ink,
            maxLines = 1,
        )
    }
}
