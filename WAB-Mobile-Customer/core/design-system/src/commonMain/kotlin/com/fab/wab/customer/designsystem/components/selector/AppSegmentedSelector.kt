package com.fab.wab.customer.designsystem.components.selector

import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.heightIn
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.fab.wab.customer.designsystem.components.text.AppText
import com.fab.wab.customer.designsystem.components.text.AppTextStyles
import com.fab.wab.customer.designsystem.theme.LocalAppColors
import com.fab.wab.customer.designsystem.theme.LocalSpacing
import com.fab.wab.customer.designsystem.theme.LocalTypography
import com.fab.wab.customer.designsystem.utils.PrimaryGradientBrush

data class SelectorOption(
    val value: String,
    val label: String,
)

/**
 * Full-width pill-style segmented selector — same visual language as ProfileScreen's PillToggle
 * but expanded to fill the available width, with a label above matching AppBaseTextField's style.
 *
 * @param options     The list of selectable options (2–4 work best)
 * @param selectedValue The currently selected option value
 * @param onValueChange Callback with the newly selected value
 * @param label       Optional uppercase label shown above the selector
 */
@Composable
fun AppSegmentedSelector(
    options: List<SelectorOption>,
    selectedValue: String,
    onValueChange: (String) -> Unit,
    modifier: Modifier = Modifier,
    label: String? = null,
) {
    val colors = LocalAppColors.current
    val spacing = LocalSpacing.current
    val typography = LocalTypography.current

    Column(modifier = modifier.fillMaxWidth()) {
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

        Row(
            modifier = Modifier
                .fillMaxWidth()
                .heightIn(min = 52.dp)
                .clip(RoundedCornerShape(50))
                .background(colors.surfaceContainer)
                .padding(4.dp),
            verticalAlignment = Alignment.CenterVertically,
        ) {
            options.forEach { option ->
                val isSelected = option.value == selectedValue
                val backgroundModifier = if (isSelected) {
                    Modifier.background(PrimaryGradientBrush)
                } else {
                    Modifier.background(colors.surfaceContainer)
                }

                Box(
                    modifier = Modifier
                        .weight(1f)
                        .heightIn(min = 44.dp)
                        .clip(RoundedCornerShape(50))
                        .then(backgroundModifier)
                        .clickable { onValueChange(option.value) },
                    contentAlignment = Alignment.Center,
                ) {
                    AppTextStyles.labelLarge(
                        text = option.label,
                        color = if (isSelected) colors.onPrimary else colors.onSurfaceVariant,
                    )
                }
            }
        }
    }
}
