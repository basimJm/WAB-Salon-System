package com.fab.wab.customer.designsystem.components.textfield

import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.text.KeyboardActions
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.input.ImeAction
import androidx.compose.ui.text.input.KeyboardCapitalization
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.text.input.PasswordVisualTransformation
import androidx.compose.ui.text.input.VisualTransformation
import androidx.compose.ui.tooling.preview.Preview
import androidx.compose.ui.unit.dp
import com.fab.wab.customer.designsystem.icons.AppIcons
import com.fab.wab.customer.designsystem.theme.AppTheme
import com.fab.wab.customer.designsystem.theme.LocalAppColors
import com.fab.wab.customer.designsystem.resources.Res
import com.fab.wab.customer.designsystem.resources.password_hint
import com.fab.wab.customer.designsystem.resources.password_placeholder

/**
 * Password text field matching WABCustomer design.
 * - Icon: lock
 * - Trailing: visibility toggle
 * - Keyboard: Password
 */
@Composable
fun AppPasswordField(
    state: TextFieldState,
    onValueChange: (String) -> Unit,
    modifier: Modifier = Modifier,
    keyboardActions: KeyboardActions = KeyboardActions.Default,
) {
    val colors = LocalAppColors.current
    var passwordVisible by remember { mutableStateOf(false) }

    AppBaseTextField(
        state = state,
        onValueChange = onValueChange,
        modifier = modifier,
        leadingIcon = AppIcons.Lock,
        trailingContent = {
            IconButton(
                onClick = { passwordVisible = !passwordVisible },
            ) {
                Icon(
                    imageVector = if (passwordVisible) {
                        AppIcons.VisibilityOff
                    } else {
                        AppIcons.Visibility
                    },
                    contentDescription = null,
                    modifier = Modifier.size(24.dp),
                    tint = colors.primaryFixedDim.copy(alpha = 0.6f),
                )
            }
        },
        keyboardOptions = KeyboardOptions(
            capitalization = KeyboardCapitalization.Unspecified,
            autoCorrectEnabled = false,
            keyboardType = KeyboardType.Password,
            imeAction = ImeAction.Unspecified,
            platformImeOptions = null,
            showKeyboardOnFocus = null,
            hintLocales = null
        ),
        keyboardActions = keyboardActions,
        visualTransformation = if (passwordVisible) {
            VisualTransformation.None
        } else {
            PasswordVisualTransformation()
        },
    )
}

@Preview
@Composable
private fun AppPasswordFieldPreview() {
    AppTheme {
        AppPasswordField(
            state = TextFieldState(
                hint = Res.string.password_hint,
                placeholder = Res.string.password_placeholder,
            ),
            onValueChange = {},
            modifier = Modifier.padding(16.dp)
        )
    }
}
