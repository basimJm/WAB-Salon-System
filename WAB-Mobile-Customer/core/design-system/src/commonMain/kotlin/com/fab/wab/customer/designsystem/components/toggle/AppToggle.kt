package com.fab.wab.customer.designsystem.components.toggle

import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.interaction.MutableInteractionSource
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.runtime.Composable
import androidx.compose.runtime.remember
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.unit.dp
import com.fab.wab.customer.designsystem.components.text.AppTextStyles
import com.fab.wab.customer.designsystem.theme.LocalAppColors

private val ToggleHeight = 36.dp
private val TogglePadding = 4.dp

data class ToggleOption(
    val label: String,
    val value: String,
)

@Composable
fun AppToggle(
    options: List<ToggleOption>,
    selectedValue: String,
    onValueChange: (String) -> Unit,
    modifier: Modifier = Modifier,
    enabled: Boolean = true,
) {
    val colors = LocalAppColors.current

    Box(
        modifier = modifier
            .fillMaxWidth()
            .height(ToggleHeight)
            .clip(RoundedCornerShape(50))
            .background(colors.surfaceContainer)
            .padding(TogglePadding),
    ) {
        Row(
            modifier = Modifier.fillMaxWidth(),
            horizontalArrangement = Arrangement.SpaceEvenly,
            content = {
                options.forEachIndexed { index, option ->
                    val isSelected = option.value == selectedValue

                    Box(
                        modifier = Modifier
                            .weight(1f)
                            .height(ToggleHeight - TogglePadding * 2)
                            .clip(RoundedCornerShape(50))
                            .background(
                                if (isSelected) colors.primaryContainer else Color.Transparent
                            )
                            .clickable(
                                interactionSource = remember { MutableInteractionSource() },
                                indication = null,
                                enabled = enabled,
                                onClick = { onValueChange(option.value) },
                            ),
                        contentAlignment = Alignment.Center,
                    ) {
                        AppTextStyles.labelMedium(
                            text = option.label,
                            color = if (isSelected) colors.onPrimaryContainer else colors.onSurfaceVariant,
                        )
                    }
                }
            }
        )
    }
}

@Composable
fun AppToggleOnOff(
    isOn: Boolean,
    onToggle: (Boolean) -> Unit,
    modifier: Modifier = Modifier,
    enabled: Boolean = true,
    onLabel: String = "ON",
    offLabel: String = "OFF",
) {
    val colors = LocalAppColors.current

    Box(
        modifier = modifier
            .height(ToggleHeight)
            .clip(RoundedCornerShape(50))
            .background(colors.surfaceContainer)
            .padding(4.dp)
            .clickable(
                interactionSource = remember { MutableInteractionSource() },
                indication = null,
                enabled = enabled,
                onClick = { onToggle(!isOn) },
            ),
    ) {
        Row(
            horizontalArrangement = Arrangement.SpaceEvenly,
            content = {
                val onWidth = if (isOn) ToggleHeight - 8.dp else 40.dp

                Box(
                    modifier = Modifier
                        .weight(1f)
                        .height(ToggleHeight - 8.dp)
                        .clip(RoundedCornerShape(50))
                        .background(
                            if (isOn) colors.primaryContainer else Color.Transparent
                        ),
                    contentAlignment = Alignment.Center,
                ) {
                    AppTextStyles.labelSmall(
                        text = onLabel,
                        color = if (isOn) colors.onPrimaryContainer else colors.onSurfaceVariant,
                    )
                }

                Box(
                    modifier = Modifier
                        .weight(1f)
                        .height(ToggleHeight - 8.dp)
                        .clip(RoundedCornerShape(50))
                        .background(
                            if (!isOn) colors.surfaceContainerHighest else Color.Transparent
                        ),
                    contentAlignment = Alignment.Center,
                ) {
                    AppTextStyles.labelSmall(
                        text = offLabel,
                        color = if (!isOn) colors.onSurface else colors.onSurfaceVariant,
                    )
                }
            }
        )
    }
}