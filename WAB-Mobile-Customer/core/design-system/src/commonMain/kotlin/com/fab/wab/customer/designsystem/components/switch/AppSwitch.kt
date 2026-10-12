package com.fab.wab.customer.designsystem.components.switch

import androidx.compose.animation.animateColorAsState
import androidx.compose.animation.core.animateFloatAsState
import androidx.compose.animation.core.tween
import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.interaction.MutableInteractionSource
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.offset
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
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.unit.dp
import com.fab.wab.customer.designsystem.theme.LocalAppColors

private val SwitchWidth = 52.dp
private val SwitchHeight = 28.dp
private val ThumbSize = 20.dp
private val ThumbPadding = 4.dp

@Composable
fun AppSwitch(
    checked: Boolean,
    onCheckedChange: (Boolean) -> Unit,
    modifier: Modifier = Modifier,
    enabled: Boolean = true,
) {
    val colors = LocalAppColors.current
    val interactionSource = remember { MutableInteractionSource() }

    val trackColor by animateColorAsState(
        targetValue = if (checked) colors.primary else colors.surfaceContainerHighest,
        animationSpec = tween(300),
        label = "trackColor"
    )

    val thumbOffset by animateFloatAsState(
        targetValue = if (checked) (SwitchWidth.value - ThumbSize.value - ThumbPadding.value * 2) else 0f,
        animationSpec = tween(300),
        label = "thumbOffset"
    )

    Box(
        modifier = modifier
            .size(SwitchWidth, SwitchHeight)
            .clip(RoundedCornerShape(50))
            .background(trackColor)
            .clickable(
                interactionSource = interactionSource,
                indication = null,
                enabled = enabled,
                onClick = { onCheckedChange(!checked) },
            ),
        contentAlignment = Alignment.CenterStart,
    ) {
        Box(
            modifier = Modifier
                .padding(horizontal = ThumbPadding)
                .offset(x = thumbOffset.dp)
                .size(ThumbSize)
                .clip(CircleShape)
                .background(Color.White)
                .shadow(
                    elevation = 2.dp,
                    shape = CircleShape,
                    ambientColor = Color.Black.copy(alpha = 0.2f),
                    spotColor = Color.Black.copy(alpha = 0.2f),
                ),
        )
    }
}

@Composable
fun AppSwitchWithLabel(
    label: String,
    description: String? = null,
    checked: Boolean,
    onCheckedChange: (Boolean) -> Unit,
    modifier: Modifier = Modifier,
    enabled: Boolean = true,
    leadingIcon: ImageVector? = null,
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

                androidx.compose.foundation.layout.Column(
                    modifier = Modifier
                        .weight(1f)
                        .padding(horizontal = 12.dp),
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

                AppSwitch(
                    checked = checked,
                    onCheckedChange = onCheckedChange,
                    enabled = enabled,
                )
            }
        )
    }
}