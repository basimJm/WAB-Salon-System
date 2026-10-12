package com.fab.wab.customer.designsystem.components.counter

import androidx.compose.animation.animateColorAsState
import androidx.compose.animation.core.animateFloatAsState
import androidx.compose.animation.core.tween
import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.interaction.MutableInteractionSource
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
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

private val CounterHeight = 48.dp
private val ButtonSize = 32.dp

@Composable
fun AppNumericCounter(
    value: Int,
    onValueChange: (Int) -> Unit,
    modifier: Modifier = Modifier,
    minValue: Int = 0,
    maxValue: Int = Int.MAX_VALUE,
    enabled: Boolean = true,
) {
    val colors = LocalAppColors.current
    
    Box(
        modifier = modifier
            .height(CounterHeight)
            .clip(RoundedCornerShape(50))
            .background(colors.surfaceContainer)
            .padding(horizontal = 8.dp, vertical = 6.dp),
    ) {
        Row(
            verticalAlignment = Alignment.CenterVertically,
            horizontalArrangement = Arrangement.spacedBy(8.dp),
            content = {
                Box(
                    modifier = Modifier
                        .size(ButtonSize)
                        .clip(CircleShape)
                        .background(
                            if (value > minValue && enabled) 
                                colors.surfaceContainerHighest 
                            else 
                                colors.surfaceContainerLow.copy(alpha = 0.5f)
                        )
                        .clickable(
                            interactionSource = remember { MutableInteractionSource() },
                            indication = null,
                            enabled = value > minValue && enabled,
                            onClick = { if (value > minValue) onValueChange(value - 1) },
                        ),
                    contentAlignment = Alignment.Center,
                ) {
                    Icon(
                        imageVector = AppIcons.Remove,
                        contentDescription = "Decrease",
                        modifier = Modifier.size(16.dp),
                        tint = if (value > minValue && enabled) 
                            colors.primary 
                        else 
                            colors.onSurfaceVariant.copy(alpha = 0.5f),
                    )
                }
                
                Box(
                    modifier = Modifier
                        .size(40.dp)
                        .clip(RoundedCornerShape(8.dp)),
                    contentAlignment = Alignment.Center,
                ) {
                    com.fab.wab.customer.designsystem.components.text.AppTextStyles.titleMedium(
                        text = value.toString(),
                        color = colors.onSurface,
                    )
                }
                
                Box(
                    modifier = Modifier
                        .size(ButtonSize)
                        .clip(CircleShape)
                        .background(
                            if (value < maxValue && enabled) 
                                colors.surfaceContainerHighest 
                            else 
                                colors.surfaceContainerLow.copy(alpha = 0.5f)
                        )
                        .clickable(
                            interactionSource = remember { MutableInteractionSource() },
                            indication = null,
                            enabled = value < maxValue && enabled,
                            onClick = { if (value < maxValue) onValueChange(value + 1) },
                        ),
                    contentAlignment = Alignment.Center,
                ) {
                    Icon(
                        imageVector = AppIcons.Add,
                        contentDescription = "Increase",
                        modifier = Modifier.size(16.dp),
                        tint = if (value < maxValue && enabled) 
                            colors.primary 
                        else 
                            colors.onSurfaceVariant.copy(alpha = 0.5f),
                    )
                }
            }
        )
    }
}

@Composable
fun AppNumericCounterWithLabel(
    label: String,
    value: Int,
    onValueChange: (Int) -> Unit,
    modifier: Modifier = Modifier,
    minValue: Int = 0,
    maxValue: Int = Int.MAX_VALUE,
    enabled: Boolean = true,
    leadingIcon: androidx.compose.ui.graphics.vector.ImageVector? = null,
) {
    val colors = LocalAppColors.current
    
    Box(
        modifier = modifier
            .fillMaxWidth()
            .clip(RoundedCornerShape(16.dp))
            .background(colors.surfaceContainerLow)
            .padding(16.dp),
    ) {
        Row(
            verticalAlignment = Alignment.CenterVertically,
            content = {
                if (leadingIcon != null) {
                    Box(
                        modifier = Modifier
                            .size(40.dp)
                            .clip(RoundedCornerShape(12.dp))
                            .background(colors.primary.copy(alpha = 0.1f)),
                        contentAlignment = Alignment.Center,
                    ) {
                        Icon(
                            imageVector = leadingIcon,
                            contentDescription = null,
                            modifier = Modifier.size(20.dp),
                            tint = colors.primary,
                        )
                    }
                }
                
                androidx.compose.foundation.layout.Spacer(
                    modifier = Modifier.padding(horizontal = 12.dp)
                )
                
                com.fab.wab.customer.designsystem.components.text.AppTextStyles.bodyMedium(
                    text = label,
                    color = colors.onSurface,
                    modifier = Modifier.weight(1f),
                )
                
                AppNumericCounter(
                    value = value,
                    onValueChange = onValueChange,
                    minValue = minValue,
                    maxValue = maxValue,
                    enabled = enabled,
                )
            }
        )
    }
}