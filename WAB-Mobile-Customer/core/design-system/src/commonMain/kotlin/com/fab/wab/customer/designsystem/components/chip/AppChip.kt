package com.fab.wab.customer.designsystem.components.chip

import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.Icon
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.unit.dp
import com.fab.wab.customer.designsystem.components.text.AppTextStyles
import com.fab.wab.customer.designsystem.theme.LocalAppColors

private val ChipShape = RoundedCornerShape(24.dp)
private val ChipPaddingHorizontal = 16.dp
private val ChipPaddingVertical = 8.dp
private val GemDotSize = 6.dp
private val GemDotGlowSize = 4.dp

enum class ChipVariant {
    PRIMARY,
    SECONDARY,
    TERTIARY,
    OUTLINED,
}

@Composable
fun AppChip(
    text: String,
    modifier: Modifier = Modifier,
    variant: ChipVariant = ChipVariant.PRIMARY,
    selected: Boolean = false,
    gemIndicator: Boolean = false,
    onClick: (() -> Unit)? = null,
) {
    val colors = LocalAppColors.current
    
    val (backgroundColor, textColor, borderColor) = when (variant) {
        ChipVariant.PRIMARY -> Triple(
            if (selected) colors.primaryContainer else colors.surfaceContainerHigh,
            if (selected) colors.onPrimaryContainer else colors.onSurface,
            Color.Transparent
        )
        ChipVariant.SECONDARY -> Triple(
            if (selected) colors.secondaryContainer else colors.surfaceContainerLow,
            if (selected) colors.onSecondaryContainer else colors.onSurfaceVariant,
            Color.Transparent
        )
        ChipVariant.TERTIARY -> Triple(
            if (selected) colors.tertiaryContainer else colors.surfaceContainerHigh,
            if (selected) colors.onTertiaryContainer else colors.onSurfaceVariant,
            Color.Transparent
        )
        ChipVariant.OUTLINED -> Triple(
            if (selected) colors.primary.copy(alpha = 0.1f) else Color.Transparent,
            if (selected) colors.primary else colors.onSurfaceVariant,
            if (selected) colors.primary.copy(alpha = 0.3f) else Color.Transparent
        )
    }
    
    Box(
        modifier = modifier
            .clip(ChipShape)
            .background(backgroundColor)
            .then(
                if (borderColor != Color.Transparent) {
                    Modifier.border(1.dp, borderColor, ChipShape)
                } else {
                    Modifier
                }
            )
            .then(
                if (onClick != null) {
                    Modifier.clickable(onClick = onClick)
                } else {
                    Modifier
                }
            )
            .padding(horizontal = ChipPaddingHorizontal, vertical = ChipPaddingVertical),
        contentAlignment = Alignment.Center,
    ) {
        Row(verticalAlignment = Alignment.CenterVertically) {
            if (gemIndicator) {
                Box(
                    modifier = Modifier
                        .size(GemDotSize + GemDotGlowSize)
                        .background(
                            colors.primary.copy(alpha = 0.3f),
                            CircleShape
                        )
                        .padding(GemDotGlowSize / 2),
                    contentAlignment = Alignment.Center,
                ) {
                    Box(
                        modifier = Modifier
                            .size(GemDotSize)
                            .background(colors.primary, CircleShape),
                    )
                }
            }
            
            AppTextStyles.labelMedium(
                text = text,
                color = textColor,
            )
        }
    }
}

@Composable
fun AppChipSelectable(
    text: String,
    modifier: Modifier = Modifier,
    selected: Boolean = false,
    onClick: () -> Unit,
) {
    AppChip(
        text = text,
        modifier = modifier,
        variant = if (selected) ChipVariant.PRIMARY else ChipVariant.OUTLINED,
        selected = selected,
        onClick = onClick,
    )
}
