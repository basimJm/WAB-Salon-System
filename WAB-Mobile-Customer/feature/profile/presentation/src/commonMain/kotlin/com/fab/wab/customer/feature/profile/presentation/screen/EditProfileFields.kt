package com.fab.wab.customer.feature.profile.presentation.screen

import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxHeight
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.text.BasicTextField
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.material3.DropdownMenu
import androidx.compose.material3.DropdownMenuItem
import androidx.compose.material3.Icon
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.alpha
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.SolidColor
import androidx.compose.ui.semantics.Role
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextDirection
import com.fab.wab.customer.designsystem.components.form.CountryUi
import com.fab.wab.customer.designsystem.components.image.AppImage
import com.fab.wab.customer.designsystem.components.text.AppText
import com.fab.wab.customer.designsystem.icons.AppIcons
import com.fab.wab.customer.designsystem.theme.AppTheme

/** Accent 12/600 label above the field box, 11.5 pink error below. */
@Composable
internal fun EditFieldFrame(label: String, modifier: Modifier = Modifier, error: String? = null, field: @Composable () -> Unit) {
    val colors = AppTheme.colors
    Column(modifier = modifier.fillMaxWidth()) {
        AppText(
            text = label,
            style = AppTheme.typography.labelMedium.copy(fontSize = EditProfileDesign.labelSize, fontWeight = FontWeight.SemiBold),
            color = colors.accent,
            modifier = Modifier.padding(bottom = EditProfileDesign.labelBottom),
        )
        field()
        if (error != null) {
            AppText(
                text = error,
                style = AppTheme.typography.bodySmall.copy(fontSize = EditProfileDesign.errorSize),
                color = colors.danger,
                modifier = Modifier.padding(top = EditProfileDesign.errorTop),
            )
        }
    }
}

/** `height:52px;border-radius:14px;border:1.5px solid` (pink on error); card background, surface when read-only. */
@Composable
private fun fieldBox(error: Boolean, readOnly: Boolean, enabled: Boolean = true): Modifier {
    val colors = AppTheme.colors
    val shape = AppTheme.shapes.medium
    return Modifier
        .fillMaxWidth()
        .height(AppTheme.sizes.fieldHeight)
        .alpha(if (enabled) 1f else AppTheme.alpha.disabled)
        .clip(shape)
        .background(if (readOnly) colors.surface else colors.card)
        .border(AppTheme.sizes.borderWidth, if (error) colors.danger else colors.line, shape)
}

@Composable
private fun inputStyle(direction: TextDirection) =
    AppTheme.typography.bodyLarge.copy(fontSize = EditProfileDesign.inputSize, color = AppTheme.colors.ink, textDirection = direction)

/** Text field of S22 (first / last name, email). */
@Composable
internal fun EditTextField(
    label: String,
    value: String,
    onValueChange: (String) -> Unit,
    modifier: Modifier = Modifier,
    error: String? = null,
    keyboardOptions: KeyboardOptions = KeyboardOptions.Default,
    direction: TextDirection = TextDirection.Content,
) {
    EditFieldFrame(label = label, modifier = modifier, error = error) {
        BasicTextField(
            value = value,
            onValueChange = onValueChange,
            modifier = Modifier.fillMaxWidth(),
            textStyle = inputStyle(direction),
            keyboardOptions = keyboardOptions,
            singleLine = true,
            cursorBrush = SolidColor(AppTheme.colors.accent),
            decorationBox = { inner ->
                Box(
                    modifier = fieldBox(error = error != null, readOnly = false).padding(horizontal = EditProfileDesign.inputHorizontal),
                    contentAlignment = Alignment.CenterStart,
                ) { inner() }
            },
        )
    }
}

/** Picker field of S22 (gender / city / area): surface background, 14 px faint chevron, options in a menu. */
@Composable
internal fun EditPickerField(
    label: String,
    options: List<String>,
    selectedIndex: Int?,
    onSelect: (Int) -> Unit,
    placeholder: String,
    modifier: Modifier = Modifier,
    error: String? = null,
    enabled: Boolean = true,
) {
    var expanded by remember { mutableStateOf(false) }
    val colors = AppTheme.colors
    val selected = selectedIndex?.let { options.getOrNull(it) }
    EditFieldFrame(label = label, modifier = modifier, error = error) {
        Box {
            Row(
                modifier = fieldBox(error = error != null, readOnly = true, enabled = enabled)
                    .clickable(enabled = enabled, role = Role.DropdownList) { expanded = true }
                    .padding(horizontal = EditProfileDesign.inputHorizontal),
                verticalAlignment = Alignment.CenterVertically,
            ) {
                AppText(
                    text = selected ?: placeholder,
                    style = inputStyle(TextDirection.Content),
                    color = if (selected != null) colors.ink else colors.faint,
                    maxLines = 1,
                    modifier = Modifier.weight(1f),
                )
                Icon(AppIcons.ExpandMore, contentDescription = null, tint = colors.faint, modifier = Modifier.size(EditProfileDesign.chevron))
            }
            DropdownMenu(expanded = expanded, onDismissRequest = { expanded = false }, containerColor = colors.card) {
                options.forEachIndexed { index, option ->
                    DropdownMenuItem(
                        text = {
                            AppText(text = option, color = if (index == selectedIndex) colors.accent else colors.ink)
                        },
                        onClick = {
                            expanded = false
                            onSelect(index)
                        },
                    )
                }
            }
        }
    }
}

/** Phone field of S22: flag + dial code prefix (`border-inline-end:1px solid var(--line)`), LTR digits. */
@Composable
internal fun EditPhoneField(
    label: String,
    value: String,
    onValueChange: (String) -> Unit,
    country: CountryUi?,
    onCountryClick: () -> Unit,
    modifier: Modifier = Modifier,
    error: String? = null,
    keyboardOptions: KeyboardOptions = KeyboardOptions.Default,
) {
    val colors = AppTheme.colors
    EditFieldFrame(label = label, modifier = modifier, error = error) {
        BasicTextField(
            value = value,
            onValueChange = onValueChange,
            modifier = Modifier.fillMaxWidth(),
            textStyle = inputStyle(TextDirection.Ltr),
            keyboardOptions = keyboardOptions,
            singleLine = true,
            cursorBrush = SolidColor(colors.accent),
            decorationBox = { inner ->
                Row(modifier = fieldBox(error = error != null, readOnly = false), verticalAlignment = Alignment.CenterVertically) {
                    Row(
                        modifier = Modifier
                            .fillMaxHeight()
                            .clickable(role = Role.Button, onClick = onCountryClick)
                            .padding(horizontal = EditProfileDesign.inputHorizontal),
                        horizontalArrangement = Arrangement.spacedBy(EditProfileDesign.prefixGap),
                        verticalAlignment = Alignment.CenterVertically,
                    ) {
                        val flag = country?.flagUrl
                        if (flag != null) {
                            AppImage(url = flag, modifier = Modifier.size(EditProfileDesign.flag).clip(AppTheme.shapes.extraSmall))
                        }
                        AppText(
                            text = country?.dialCode.orEmpty(),
                            style = AppTheme.typography.labelMedium.copy(
                                fontSize = EditProfileDesign.prefixTextSize,
                                fontWeight = FontWeight.SemiBold,
                                textDirection = TextDirection.Ltr,
                            ),
                            maxLines = 1,
                        )
                    }
                    Box(Modifier.width(AppTheme.sizes.hairline).fillMaxHeight().background(colors.line))
                    Box(
                        modifier = Modifier.weight(1f).padding(horizontal = EditProfileDesign.inputHorizontal),
                        contentAlignment = Alignment.CenterStart,
                    ) { inner() }
                }
            },
        )
    }
}
