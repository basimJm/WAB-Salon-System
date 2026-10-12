package com.fab.wab.customer.designsystem.components.textfield

import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.text.KeyboardActions
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier
import androidx.compose.ui.tooling.preview.Preview
import androidx.compose.ui.unit.dp
import com.fab.wab.customer.designsystem.theme.AppTheme
import com.fab.wab.customer.designsystem.resources.Res
import com.fab.wab.customer.designsystem.resources.email_hint
import com.fab.wab.customer.designsystem.resources.email_placeholder

/**
 * Normal text field matching WABCustomer design.
 * - No icon
 * - Standard keyboard
 */
@Composable
fun AppTextField(
    state: TextFieldState,
    onValueChange: (String) -> Unit,
    modifier: Modifier = Modifier,
    keyboardOptions: KeyboardOptions = KeyboardOptions.Default,
    keyboardActions: KeyboardActions = KeyboardActions.Default,
) {
    AppBaseTextField(
        state = state,
        onValueChange = onValueChange,
        modifier = modifier,
        keyboardOptions = keyboardOptions,
        keyboardActions = keyboardActions,
    )
}

@Preview
@Composable
private fun AppTextFieldPreview() {
    AppTheme {
        AppTextField(
            state = TextFieldState(
                hint = Res.string.email_hint,
                placeholder = Res.string.email_placeholder,
            ),
            onValueChange = {},
            modifier = Modifier.padding(16.dp)
        )
    }
}
