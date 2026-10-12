package com.fab.wab.customer.designsystem.components.button

import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.interaction.MutableInteractionSource
import androidx.compose.foundation.interaction.collectIsPressedAsState
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.remember
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.unit.dp
import com.fab.wab.customer.designsystem.components.text.AppTextStyles
import com.fab.wab.customer.designsystem.theme.LocalAppColors
import com.fab.wab.customer.designsystem.utils.primaryGradientBackground

private val ButtonShape = RoundedCornerShape(16.dp)
private val ButtonHeight = 56.dp
private val LoadingSpinnerSize = 24.dp
private val LoadingSpinnerStrokeWidth = 2.dp

@Composable
fun AppPrimaryButton(
    onClick: () -> Unit,
    modifier: Modifier = Modifier,
    enabled: Boolean = true,
    loading: Boolean = false,
    content: @Composable () -> Unit,
) {
    val colors = LocalAppColors.current
    val interactionSource = remember { MutableInteractionSource() }

    Box(
        modifier = modifier
            .height(ButtonHeight)
            .primaryGradientBackground(enabled = enabled && !loading, shape = ButtonShape)
            .clickable(
                interactionSource = interactionSource,
                indication = null,
                enabled = enabled && !loading,
                onClick = onClick,
            ),
        contentAlignment = Alignment.Center,
    ) {
        if (loading) {
            CircularProgressIndicator(
                modifier = Modifier.size(LoadingSpinnerSize),
                color = colors.onPrimary,
                strokeWidth = LoadingSpinnerStrokeWidth,
            )
        } else {
            content()
        }
    }
}

@Composable
fun AppPrimaryTextButton(
    text: String,
    onClick: () -> Unit,
    modifier: Modifier = Modifier,
    enabled: Boolean = true,
    loading: Boolean = false,
) {
    val colors = LocalAppColors.current
    val interactionSource = remember { MutableInteractionSource() }

    Box(
        modifier = modifier
            .height(ButtonHeight)
            .fillMaxWidth()
            .primaryGradientBackground(enabled = enabled && !loading, shape = ButtonShape)
            .clickable(
                interactionSource = interactionSource,
                indication = null,
                enabled = enabled && !loading,
                onClick = onClick,
            ),
        contentAlignment = Alignment.Center,
    ) {
        if (loading) {
            CircularProgressIndicator(
                modifier = Modifier.size(LoadingSpinnerSize),
                color = colors.onPrimary,
                strokeWidth = LoadingSpinnerStrokeWidth,
            )
        } else {
            AppTextStyles.labelLarge(
                text = text,
                color = colors.onPrimary
            )
        }
    }
}

@Composable
fun AppOutlinedButton(
    text: String,
    onClick: () -> Unit,
    modifier: Modifier = Modifier,
    enabled: Boolean = true,
) {
    val colors = LocalAppColors.current
    val interactionSource = remember { MutableInteractionSource() }
    val isPressed by interactionSource.collectIsPressedAsState()

    Box(
        modifier = modifier
            .height(ButtonHeight)
            .fillMaxWidth()
            .clip(ButtonShape)
            .background(
                if (isPressed) colors.primary.copy(alpha = 0.05f)
                else Color.Transparent
            )
            .clickable(
                interactionSource = interactionSource,
                indication = null,
                enabled = enabled,
                onClick = onClick,
            ),
        contentAlignment = Alignment.Center,
    ) {
        AppTextStyles.labelLarge(
            text = text,
            color = colors.primary
        )
    }
}

@Composable
fun AppDestructiveButton(
    text: String,
    onClick: () -> Unit,
    modifier: Modifier = Modifier,
    enabled: Boolean = true,
) {
    val colors = LocalAppColors.current
    val interactionSource = remember { MutableInteractionSource() }
    val isPressed by interactionSource.collectIsPressedAsState()

    Box(
        modifier = modifier
            .height(ButtonHeight)
            .fillMaxWidth()
            .clip(ButtonShape)
            .background(
                if (isPressed) colors.error.copy(alpha = 0.1f)
                else Color.Transparent
            )
            .clickable(
                interactionSource = interactionSource,
                indication = null,
                enabled = enabled,
                onClick = onClick,
            ),
        contentAlignment = Alignment.Center,
    ) {
        AppTextStyles.labelLarge(
            text = text,
            color = colors.error
        )
    }
}