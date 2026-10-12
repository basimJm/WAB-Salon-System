package com.fab.wab.customer.designsystem.components.checkbox

import androidx.compose.animation.animateColorAsState
import androidx.compose.animation.core.animateFloatAsState
import androidx.compose.animation.core.tween
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.interaction.MutableInteractionSource
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.Icon
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.remember
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.draw.shadow
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.unit.dp
import com.fab.wab.customer.designsystem.icons.AppIcons
import com.fab.wab.customer.designsystem.theme.LocalAppColors

private val CheckboxSize = 24.dp
private val CheckboxBorderWidth = 2.dp

@Composable
fun AppCheckbox(
    checked: Boolean,
    onCheckedChange: (Boolean) -> Unit,
    modifier: Modifier = Modifier,
    enabled: Boolean = true,
) {
    val colors = LocalAppColors.current
    val interactionSource = remember { MutableInteractionSource() }
    
    val backgroundColor by animateColorAsState(
        targetValue = if (checked) colors.primary else Color.Transparent,
        animationSpec = tween(200),
        label = "checkboxBg"
    )
    
    val borderColor by animateColorAsState(
        targetValue = if (checked) colors.primary else colors.outline,
        animationSpec = tween(200),
        label = "checkboxBorder"
    )
    
    Box(
        modifier = modifier
            .size(CheckboxSize)
            .clip(RoundedCornerShape(6.dp))
            .background(backgroundColor)
            .border(CheckboxBorderWidth, borderColor, RoundedCornerShape(6.dp))
            .clickable(
                interactionSource = interactionSource,
                indication = null,
                enabled = enabled,
                onClick = { onCheckedChange(!checked) },
            ),
        contentAlignment = Alignment.Center,
    ) {
        if (checked) {
            Icon(
                imageVector = AppIcons.Check,
                contentDescription = "Checked",
                modifier = Modifier.size(16.dp),
                tint = colors.onPrimary,
            )
        }
    }
}

@Composable
fun AppCheckboxWithLabel(
    label: String,
    checked: Boolean,
    onCheckedChange: (Boolean) -> Unit,
    modifier: Modifier = Modifier,
    enabled: Boolean = true,
    description: String? = null,
) {
    val colors = LocalAppColors.current
    
    Box(
        modifier = modifier
            .fillMaxWidth()
            .clip(RoundedCornerShape(16.dp))
            .background(colors.surfaceContainerLow)
            .padding(16.dp)
    ) {
        Row(
            verticalAlignment = Alignment.CenterVertically,
            content = {
                AppCheckbox(
                    checked = checked,
                    onCheckedChange = onCheckedChange,
                    enabled = enabled,
                )
                
                androidx.compose.foundation.layout.Column(
                    modifier = Modifier.padding(start = 12.dp),
                    content = {
                        com.fab.wab.customer.designsystem.components.text.AppTextStyles.bodyMedium(
                            text = label,
                            color = colors.onSurface,
                        )
                        
                        if (description != null) {
                            com.fab.wab.customer.designsystem.components.text.AppTextStyles.bodySmall(
                                text = description,
                                color = colors.onSurfaceVariant,
                            )
                        }
                    }
                )
            }
        )
    }
}

@Composable
fun AppRadioButton(
    selected: Boolean,
    onSelectedChange: (Boolean) -> Unit,
    modifier: Modifier = Modifier,
    enabled: Boolean = true,
) {
    val colors = LocalAppColors.current
    val interactionSource = remember { MutableInteractionSource() }
    
    val borderColor by animateColorAsState(
        targetValue = if (selected) colors.primary else colors.outline,
        animationSpec = tween(200),
        label = "radioBorder"
    )
    
    Box(
        modifier = modifier
            .size(24.dp)
            .clip(CircleShape)
            .background(Color.Transparent)
            .border(2.dp, borderColor, CircleShape)
            .clickable(
                interactionSource = interactionSource,
                indication = null,
                enabled = enabled,
                onClick = { onSelectedChange(!selected) },
            ),
        contentAlignment = Alignment.Center,
    ) {
        if (selected) {
            Box(
                modifier = Modifier
                    .size(12.dp)
                    .clip(CircleShape)
                    .background(colors.primary),
            )
        }
    }
}
