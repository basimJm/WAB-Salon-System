package com.fab.wab.customer.designsystem.components.textfield

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.text.KeyboardActions
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.CompositionLocalProvider
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.platform.LocalLayoutDirection
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.tooling.preview.Preview
import androidx.compose.ui.unit.LayoutDirection
import androidx.compose.ui.unit.dp
import com.fab.wab.customer.designsystem.icons.AppIcons
import com.fab.wab.customer.designsystem.theme.AppTheme
import com.fab.wab.customer.designsystem.theme.LocalAppColors
import com.fab.wab.customer.designsystem.theme.LocalTypography
import com.fab.wab.customer.designsystem.resources.Res
import com.fab.wab.customer.designsystem.resources.phone_hint
import com.fab.wab.customer.designsystem.resources.phone_placeholder

/**
 * Phone text field matching WABCustomer design for Jordanian numbers.
 * - Icon: phone
 * - Prefix: +962 (bold)
 * - Placeholder: "7X XXX XXXX"
 */
@Composable
fun AppPhoneField(
    state: TextFieldState,
    onValueChange: (String) -> Unit,
    modifier: Modifier = Modifier,
    countryCode: String = "+962",
    keyboardActions: KeyboardActions = KeyboardActions.Default,
) {
    val colors = LocalAppColors.current
    val typography = LocalTypography.current
    CompositionLocalProvider(LocalLayoutDirection provides LayoutDirection.Ltr) {
        AppBaseTextField(
            state = state,
            onValueChange = onValueChange,
            modifier = modifier,
            leadingIcon = AppIcons.Phone,
            leadingContent = {
                Row(
                    verticalAlignment = Alignment.CenterVertically,
                    modifier = Modifier.padding(end = 12.dp),
                ) {
                    // Divider
                    Box(
                        modifier = Modifier
                            .width(1.dp)
                            .padding(vertical = 12.dp)
                            .background(
                                colors.outlineVariant.copy(alpha = 0.3f),
                                RoundedCornerShape(1.dp),
                            ),
                    )

                    // Country Code
                    Text(
                        text = countryCode,
                        style = typography.labelSmall.copy(
                            color = colors.primary,
                            fontWeight = FontWeight.Bold,
                        ),
                        modifier = Modifier.padding(start = 8.dp),
                    )
                }
            },
            keyboardOptions = KeyboardOptions(
                keyboardType = KeyboardType.Phone,
            ),
            keyboardActions = keyboardActions,
        )
    }
}

@Preview
@Composable
private fun AppPhoneFieldPreview() {
    AppTheme {
        AppPhoneField(
            state = TextFieldState(
                hint = Res.string.phone_hint,
                placeholder = Res.string.phone_placeholder,
            ),
            onValueChange = {},
            modifier = Modifier.padding(16.dp)
        )
    }
}
