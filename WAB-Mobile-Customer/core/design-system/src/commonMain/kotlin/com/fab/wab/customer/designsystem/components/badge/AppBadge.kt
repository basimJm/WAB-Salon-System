package com.fab.wab.customer.designsystem.components.badge

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.Icon
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.draw.shadow
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.unit.dp
import com.fab.wab.customer.designsystem.icons.AppIcons
import com.fab.wab.customer.designsystem.theme.LocalAppColors

enum class BadgeType {
    PRIMARY,
    SUCCESS,
    WARNING,
    ERROR,
    INFO,
}

@Composable
fun AppBadge(
    text: String,
    modifier: Modifier = Modifier,
    type: BadgeType = BadgeType.PRIMARY,
    showDot: Boolean = true,
) {
    val colors = LocalAppColors.current
    
    val mainColor = when (type) {
        BadgeType.PRIMARY -> colors.primary
        BadgeType.SUCCESS -> colors.success
        BadgeType.WARNING -> colors.warning
        BadgeType.ERROR -> colors.error
        BadgeType.INFO -> colors.info
    }
    
    Box(
        modifier = modifier
            .clip(RoundedCornerShape(24.dp))
            .background(mainColor.copy(alpha = 0.15f))
            .padding(horizontal = 8.dp, vertical = 4.dp),
        contentAlignment = Alignment.Center,
    ) {
        androidx.compose.foundation.layout.Row(
            verticalAlignment = Alignment.CenterVertically,
            content = {
                if (showDot) {
                    Box(
                        modifier = Modifier
                            .size(8.dp)
                            .clip(CircleShape)
                            .background(mainColor),
                    )
                }
                
                androidx.compose.foundation.layout.Spacer(
                    modifier = Modifier.padding(start = 4.dp)
                )
                
                com.fab.wab.customer.designsystem.components.text.AppTextStyles.labelSmall(
                    text = text,
                    color = mainColor,
                )
            }
        )
    }
}

@Composable
fun AppStatusBadge(
    text: String,
    modifier: Modifier = Modifier,
    type: BadgeType = BadgeType.PRIMARY,
) {
    AppBadge(
        text = text,
        modifier = modifier,
        type = type,
        showDot = true,
    )
}

@Composable
fun AppDotIndicator(
    modifier: Modifier = Modifier,
    type: BadgeType = BadgeType.PRIMARY,
    size: Int = 8,
) {
    val colors = LocalAppColors.current
    
    val dotColor = when (type) {
        BadgeType.PRIMARY -> colors.primary
        BadgeType.SUCCESS -> colors.success
        BadgeType.WARNING -> colors.warning
        BadgeType.ERROR -> colors.error
        BadgeType.INFO -> colors.info
    }
    
    Box(
        modifier = modifier
            .size(size.dp)
            .shadow(
                elevation = 2.dp,
                shape = CircleShape,
                ambientColor = dotColor,
                spotColor = dotColor,
            )
            .background(dotColor, CircleShape),
    )
}
