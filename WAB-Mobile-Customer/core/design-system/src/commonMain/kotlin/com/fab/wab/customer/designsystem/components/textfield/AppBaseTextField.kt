package com.fab.wab.customer.designsystem.components.textfield

import androidx.compose.foundation.background
import androidx.compose.foundation.interaction.MutableInteractionSource
import androidx.compose.foundation.interaction.collectIsFocusedAsState
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxHeight
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.heightIn
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.text.BasicTextField
import androidx.compose.foundation.text.KeyboardActions
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.material3.Icon
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.remember
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.draw.drawBehind
import androidx.compose.ui.focus.focusRequester
import androidx.compose.ui.geometry.CornerRadius
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.graphics.SolidColor
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.text.TextStyle
import androidx.compose.ui.text.input.VisualTransformation
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.Dp
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.fab.wab.customer.designsystem.components.text.AppText
import com.fab.wab.customer.designsystem.components.text.AppTextStyles
import com.fab.wab.customer.designsystem.theme.LocalAppColors
import com.fab.wab.customer.designsystem.theme.LocalSpacing
import com.fab.wab.customer.designsystem.theme.LocalTypography
import org.jetbrains.compose.resources.stringResource

private val FieldHeight = 56.dp
private val FieldCornerRadius = 16.dp
private val IconSize = 24.dp
private val IconPadding = 12.dp
private val HorizontalPadding = 16.dp

/**
 * Base text field component matching the WABCustomer "Line-free" design system.
 */
@Composable
fun AppBaseTextField(
    state: TextFieldState,
    onValueChange: (String) -> Unit,
    modifier: Modifier = Modifier,
    leadingIcon: ImageVector? = null,
    leadingContent: @Composable (() -> Unit)? = null,
    trailingContent: @Composable (() -> Unit)? = null,
    keyboardOptions: KeyboardOptions = KeyboardOptions.Default,
    keyboardActions: KeyboardActions = KeyboardActions.Default,
    visualTransformation: VisualTransformation = VisualTransformation.None,
    placeholderStyle: TextStyle? = null,
    singleLine: Boolean = true,
    minFieldHeight: Dp = FieldHeight,
) {
    val colors = LocalAppColors.current
    val spacing = LocalSpacing.current
    val typography = LocalTypography.current
    val interactionSource = remember { MutableInteractionSource() }
    val isFocused by interactionSource.collectIsFocusedAsState()

    // Design: surfaceContainer (default) -> surfaceBright (focused)
    val backgroundColor = if (isFocused) colors.surfaceBright else colors.surfaceContainer

    // Focus Glow: Subtle emerald ambient glow
    val glowColor = colors.primary.copy(alpha = 0.15f)

    Column(modifier = modifier.fillMaxWidth()) {
        // Label (Hint) - "STATE: DEFAULT" style from design
        if (state.isHintVisible) {
            AppText(
                text = stringResource(state.hint).uppercase(),
                style = typography.labelSmall.copy(
                    color = colors.primaryFixedDim,
                    letterSpacing = 1.5.sp
                ),
                modifier = Modifier.padding(bottom = 8.dp, start = 4.dp)
            )
        }

        Box(
            modifier = Modifier
                .fillMaxWidth()
                .heightIn(min = minFieldHeight)
                .drawBehind {
                    if (isFocused) {
                        drawRoundRect(
                            color = glowColor,
                            cornerRadius = CornerRadius(FieldCornerRadius.toPx() + 4.dp.toPx()),
                            size = size.copy(
                                width = size.width + 12.dp.toPx(),
                                height = size.height + 12.dp.toPx()
                            ),
                            topLeft = Offset(-6.dp.toPx(), -6.dp.toPx())
                        )
                    }
                }
                .clip(RoundedCornerShape(FieldCornerRadius))
                .background(backgroundColor)
                .then(
                    if (state.focusRequester != null) {
                        Modifier.focusRequester(state.focusRequester)
                    } else {
                        Modifier
                    }
                ),
            contentAlignment = Alignment.CenterStart
        ) {
            Row(
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(horizontal = HorizontalPadding),
                verticalAlignment = if (singleLine) Alignment.CenterVertically else Alignment.Top,
            ) {
                // Leading Icon
                if (leadingIcon != null) {
                    Icon(
                        imageVector = leadingIcon,
                        contentDescription = null,
                        modifier = Modifier
                            .size(IconSize)
                            .padding(end = IconPadding),
                        tint = colors.primaryFixedDim,
                    )
                }

                // Custom Leading Content
                if (leadingContent != null) {
                    leadingContent()
                }

                // Text Field
                Box(
                    modifier = Modifier
                        .weight(1f)
                        .heightIn(min = minFieldHeight)
                        .then(if (!singleLine) Modifier.padding(vertical = spacing.space12) else Modifier),
                    contentAlignment = Alignment.CenterStart,
                ) {
                    BasicTextField(
                        modifier = Modifier.fillMaxWidth(),
                        value = state.textFieldValue.text,
                        onValueChange = {
                            if (it.length <= state.length && it != state.textFieldValue.text) onValueChange(
                                it
                            )
                        },
                        enabled = state.isEnabled,
                        textStyle = typography.bodyMedium.copy(
                            color = colors.primaryFixed,
                            textAlign = TextAlign.Start,
                        ),
                        keyboardOptions = keyboardOptions,
                        keyboardActions = keyboardActions,
                        singleLine = singleLine,
                        visualTransformation = visualTransformation,
                        cursorBrush = SolidColor(colors.primary),
                        interactionSource = interactionSource,
                        decorationBox = { innerTextField ->
                            Box(
                                modifier = Modifier.fillMaxWidth(),
                                contentAlignment = Alignment.CenterStart,
                            ) {
                                if (state.textFieldValue.text.isEmpty() && state.placeholder != null) {
                                    AppText(
                                        text = stringResource(state.placeholder),
                                        style = placeholderStyle ?: typography.bodyMedium.copy(
                                            color = colors.primaryFixedDim.copy(alpha = 0.4f),
                                        ),
                                        textAlign = TextAlign.Start,
                                    )
                                }
                                innerTextField()
                            }
                        },
                    )
                }

                // Trailing Content
                if (trailingContent != null) {
                    trailingContent()
                }
            }
        }

        // Error Message
        if (state.errorId != null) {
            AppTextStyles.labelSmall(
                text = stringResource(state.errorId),
                color = colors.error,
                modifier = Modifier.padding(top = 8.dp, start = 4.dp),
            )
        } else if (!state.stringError.isNullOrEmpty()) {
            AppTextStyles.labelSmall(
                text = state.stringError,
                color = colors.error,
                modifier = Modifier.padding(top = 8.dp, start = 4.dp),
            )
        }
    }
}
