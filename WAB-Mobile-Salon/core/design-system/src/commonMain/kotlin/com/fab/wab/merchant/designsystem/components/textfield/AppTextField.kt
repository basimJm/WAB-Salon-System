package com.fab.wab.merchant.designsystem.components.textfield

import androidx.compose.foundation.interaction.MutableInteractionSource
import androidx.compose.foundation.interaction.collectIsFocusedAsState
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.defaultMinSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.text.BasicTextField
import androidx.compose.foundation.text.KeyboardActions
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.runtime.Composable
import androidx.compose.runtime.CompositionLocalProvider
import androidx.compose.runtime.getValue
import androidx.compose.runtime.remember
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.alpha
import androidx.compose.ui.graphics.SolidColor
import androidx.compose.ui.platform.LocalLayoutDirection
import androidx.compose.ui.text.input.VisualTransformation
import androidx.compose.ui.text.style.TextDirection
import androidx.compose.ui.unit.LayoutDirection
import com.fab.wab.merchant.designsystem.components.surface.cardBackground
import com.fab.wab.merchant.designsystem.components.text.AppText
import com.fab.wab.merchant.designsystem.theme.AppTheme

/** Debounce for search-as-you-type inputs; ViewModels use it so no request is sent per keystroke. */
const val SEARCH_DEBOUNCE_MILLIS = 500L

/**
 * Text field with the design's states: default, focused, filled, error (message below) and disabled.
 * The label sits above the field; [leading] and [trailing] are Start/End slots. [fieldDirection] fixes the direction of
 * the field box only (the phone field is left to right in both languages, like the design's `dir="ltr"` box), while
 * the label and the error keep the screen's direction.
 */
@Composable
fun AppTextField(
    value: String,
    onValueChange: (String) -> Unit,
    modifier: Modifier = Modifier,
    label: String? = null,
    placeholder: String? = null,
    error: String? = null,
    enabled: Boolean = true,
    readOnly: Boolean = false,
    singleLine: Boolean = true,
    keyboardOptions: KeyboardOptions = KeyboardOptions.Default,
    keyboardActions: KeyboardActions = KeyboardActions.Default,
    visualTransformation: VisualTransformation = VisualTransformation.None,
    leading: (@Composable () -> Unit)? = null,
    trailing: (@Composable () -> Unit)? = null,
    textDirection: TextDirection? = null,
    fieldDirection: LayoutDirection? = null,
) {
    val interaction = remember { MutableInteractionSource() }
    val focused by interaction.collectIsFocusedAsState()
    val colors = AppTheme.colors
    val spacing = AppTheme.spacing
    val borderColor = when {
        error != null -> colors.danger
        focused -> colors.accent
        else -> colors.line
    }
    Column(modifier = modifier.fillMaxWidth(), verticalArrangement = Arrangement.spacedBy(spacing.space6)) {
        if (label != null) {
            AppText(text = label, style = AppTheme.typography.labelMedium, color = colors.muted)
        }
        BasicTextField(
            value = value,
            onValueChange = onValueChange,
            modifier = Modifier.fillMaxWidth(),
            enabled = enabled,
            readOnly = readOnly,
            textStyle = AppTheme.typography.bodyLarge.copy(color = colors.ink, textDirection = textDirection ?: TextDirection.Unspecified),
            keyboardOptions = keyboardOptions,
            keyboardActions = keyboardActions,
            singleLine = singleLine,
            visualTransformation = visualTransformation,
            interactionSource = interaction,
            cursorBrush = SolidColor(colors.accent),
            decorationBox = { inner ->
                val direction = fieldDirection ?: LocalLayoutDirection.current
                CompositionLocalProvider(LocalLayoutDirection provides direction) {
                    Row(
                        modifier = Modifier
                            .fillMaxWidth()
                            .defaultMinSize(minHeight = AppTheme.sizes.fieldHeight)
                            .alpha(if (enabled) 1f else AppTheme.alpha.disabled)
                            .cardBackground(AppTheme.surfaces, AppTheme.shapes.medium, stateBorder = borderColor)
                            .padding(horizontal = spacing.space14),
                        verticalAlignment = Alignment.CenterVertically,
                        horizontalArrangement = Arrangement.spacedBy(spacing.space8),
                    ) {
                        leading?.invoke()
                        Box(modifier = Modifier.weight(1f), contentAlignment = Alignment.CenterStart) {
                            if (value.isEmpty() && placeholder != null) {
                                AppText(text = placeholder, style = AppTheme.typography.bodyLarge, color = colors.faint, maxLines = 1)
                            }
                            inner()
                        }
                        trailing?.invoke()
                    }
                }
            },
        )
        if (error != null) {
            AppText(text = error, style = AppTheme.typography.bodySmall, color = colors.danger)
        }
    }
}
