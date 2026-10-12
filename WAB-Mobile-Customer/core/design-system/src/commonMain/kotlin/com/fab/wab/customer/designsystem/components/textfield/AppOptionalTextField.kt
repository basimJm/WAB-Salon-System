package com.fab.wab.customer.designsystem.components.textfield

import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.text.KeyboardActions
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.font.FontStyle
import androidx.compose.ui.tooling.preview.Preview
import androidx.compose.ui.unit.dp
import com.fab.wab.customer.designsystem.theme.AppTheme
import com.fab.wab.customer.designsystem.theme.LocalAppColors
import com.fab.wab.customer.designsystem.theme.LocalTypography
import com.fab.wab.customer.designsystem.resources.Res
import com.fab.wab.customer.designsystem.resources.optional_hint
import com.fab.wab.customer.designsystem.resources.optional_placeholder

/**
 * Optional text field matching WABCustomer design.
 * - No icon
 * - Italic placeholder
 */
@Composable
fun AppOptionalTextField(
    state: TextFieldState,
    onValueChange: (String) -> Unit,
    modifier: Modifier = Modifier,
    keyboardOptions: KeyboardOptions = KeyboardOptions.Default,
    keyboardActions: KeyboardActions = KeyboardActions.Default,
) {
    val colors = LocalAppColors.current
    val typography = LocalTypography.current

    AppBaseTextField(
        state = state,
        onValueChange = onValueChange,
        modifier = modifier,
        keyboardOptions = keyboardOptions,
        keyboardActions = keyboardActions,
        placeholderStyle = typography.bodyMedium.copy(
            color = colors.primaryFixedDim.copy(alpha = 0.4f),
            fontStyle = FontStyle.Italic,
        )
    )
}

@Preview
@Composable
private fun AppOptionalTextFieldPreview() {
    AppTheme {
        AppOptionalTextField(
            state = TextFieldState(
                hint = Res.string.optional_hint,
                placeholder = Res.string.optional_placeholder,
            ),
            onValueChange = {},
            modifier = Modifier.padding(16.dp)
        )
    }
}
