package com.fab.wab.customer.feature.auth.presentation.screen

import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.text.BasicTextField
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.alpha
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.SolidColor
import androidx.compose.ui.text.style.TextDirection
import com.fab.wab.customer.designsystem.components.glass.glassBackground
import com.fab.wab.customer.designsystem.components.text.AppText
import com.fab.wab.customer.designsystem.theme.AppTheme

/**
 * The design's `field(err, dis)`: one 52 dp box, radius 14, 1.5 dp line/danger border, `padding:0 14px`, 15 px text,
 * placeholder faint, no inner label and no inner error line (the block around it draws both). `AppTextField` always
 * reserves an error line when a message is set and uses 16 px text, so this stays private here.
 */
@Composable
internal fun AuthTextField(
    value: String,
    onValueChange: (String) -> Unit,
    modifier: Modifier = Modifier,
    placeholder: String? = null,
    error: Boolean = false,
    enabled: Boolean = true,
    keyboardOptions: KeyboardOptions = KeyboardOptions.Default,
    textDirection: TextDirection = TextDirection.Content,
) {
    val colors = AppTheme.colors
    val shape = AppTheme.shapes.medium
    val textStyle = AppTheme.typography.bodyLarge.copy(
        fontSize = AuthDesign.fieldTextSize,
        color = colors.ink,
        textDirection = textDirection,
    )
    BasicTextField(
        value = value,
        onValueChange = onValueChange,
        modifier = modifier.fillMaxWidth(),
        enabled = enabled,
        singleLine = true,
        textStyle = textStyle,
        keyboardOptions = keyboardOptions,
        cursorBrush = SolidColor(colors.accent),
        decorationBox = { inner ->
            Box(
                modifier = Modifier
                    .fillMaxWidth()
                    .height(AppTheme.sizes.fieldHeight)
                    .alpha(if (enabled) 1f else AppTheme.alpha.disabled)
                    .clip(shape)
                    .glassBackground(AppTheme.glass, shape, stateBorder = if (error) colors.danger else Color.Unspecified)
                    .padding(horizontal = AppTheme.spacing.space14),
                contentAlignment = Alignment.CenterStart,
            ) {
                if (value.isEmpty() && placeholder != null) {
                    AppText(text = placeholder, style = textStyle, color = colors.faint, maxLines = 1)
                }
                inner()
            }
        },
    )
}
