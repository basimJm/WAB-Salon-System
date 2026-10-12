package com.fab.wab.customer.designsystem.components.textfield

import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.heightIn
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.shape.RoundedCornerShape
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
import androidx.compose.ui.draw.clip
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.fab.wab.customer.designsystem.components.text.AppText
import com.fab.wab.customer.designsystem.components.text.AppTextStyles
import com.fab.wab.customer.designsystem.icons.AppIcons
import com.fab.wab.customer.designsystem.theme.LocalAppColors
import com.fab.wab.customer.designsystem.theme.LocalSpacing
import com.fab.wab.customer.designsystem.theme.LocalTypography
import org.jetbrains.compose.resources.StringResource
import org.jetbrains.compose.resources.stringResource

private val DropdownCornerRadius = 16.dp
private val DropdownHeight = 56.dp
private val HorizontalPadding = 16.dp

data class DropdownOption(
    val value: String,
    val label: String? = null,
    val labelRes: StringResource? = null
)

@Composable
fun AppDropdown(
    selectedValue: String,
    options: List<DropdownOption>,
    onValueChange: (String) -> Unit,
    modifier: Modifier = Modifier,
    label: String? = null,
    placeholder: String? = null,
    error: String? = null,
    enabled: Boolean = true,
) {
    val colors = LocalAppColors.current
    val typography = LocalTypography.current
    val spacing = LocalSpacing.current

    var expanded by remember { mutableStateOf(false) }
    val selectedOption = options.find { it.value == selectedValue }

    Column(modifier = modifier.fillMaxWidth()) {
        // Label — matches AppBaseTextField hint style
        label?.let {
            AppText(
                text = it.uppercase(),
                style = typography.labelSmall.copy(
                    color = colors.primaryFixedDim,
                    letterSpacing = 1.5.sp
                ),
                modifier = Modifier.padding(bottom = spacing.space8, start = 4.dp)
            )
        }

        Box {
            Row(
                modifier = Modifier
                    .fillMaxWidth()
                    .heightIn(min = DropdownHeight)
                    .clip(RoundedCornerShape(DropdownCornerRadius))
                    .background(if (expanded) colors.surfaceBright else colors.surfaceContainer)
                    .clickable(enabled = enabled) { expanded = true }
                    .padding(horizontal = HorizontalPadding),
                verticalAlignment = Alignment.CenterVertically
            ) {
                AppText(
                    text = selectedOption?.label ?: placeholder ?: "",
                    style = typography.bodyMedium.copy(
                        color = if (selectedOption != null) colors.primaryFixed
                        else colors.primaryFixedDim.copy(alpha = 0.4f)
                    ),
                    modifier = Modifier.weight(1f)
                )
                Icon(
                    imageVector = if (expanded) AppIcons.ExpandLess else AppIcons.ExpandMore,
                    contentDescription = null,
                    tint = colors.primaryFixedDim,
                    modifier = Modifier.size(24.dp)
                )
            }

            DropdownMenu(
                expanded = expanded,
                onDismissRequest = { expanded = false },
                modifier = Modifier
                    .fillMaxWidth(0.9f)
                    .background(colors.surfaceContainerHigh)
            ) {
                options.forEach { option ->
                    val optionLabel = option.label ?: option.labelRes?.let { stringResource(it) }

                    DropdownMenuItem(
                        text = {
                            AppText(
                                text = optionLabel ?: "",
                                style = typography.bodyMedium.copy(
                                    color = if (option.value == selectedValue) colors.primary
                                    else colors.onSurface
                                )
                            )
                        },
                        onClick = {
                            onValueChange(option.value)
                            expanded = false
                        }
                    )
                }
            }
        }

        // Error message — matches AppBaseTextField error style
        if (error != null) {
            AppTextStyles.labelSmall(
                text = error,
                color = colors.error,
                modifier = Modifier.padding(top = spacing.space8, start = 4.dp)
            )
        }
    }
}
