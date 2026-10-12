package com.fab.wab.customer.designsystem.components.dialog

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.Icon
import androidx.compose.material3.MaterialTheme
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.blur
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.tooling.preview.Preview
import androidx.compose.ui.unit.dp
import androidx.compose.ui.window.Dialog
import androidx.compose.ui.window.DialogProperties
import com.fab.wab.customer.designsystem.components.button.AppOutlinedButton
import com.fab.wab.customer.designsystem.components.button.AppPrimaryTextButton
import com.fab.wab.customer.designsystem.components.text.AppText
import com.fab.wab.customer.designsystem.components.text.AppTextStyles
import com.fab.wab.customer.designsystem.icons.AppIcons
import com.fab.wab.customer.designsystem.theme.AppTheme
import com.fab.wab.customer.designsystem.theme.DefaultSpacingTokens
import com.fab.wab.customer.designsystem.theme.LocalAppColors
import com.fab.wab.customer.designsystem.theme.RadiusCard
import com.fab.wab.customer.designsystem.resources.Res
import com.fab.wab.customer.designsystem.resources.error_message
import com.fab.wab.customer.designsystem.resources.error_title
import com.fab.wab.customer.designsystem.resources.ok
import com.fab.wab.customer.designsystem.resources.retry
import com.fab.wab.customer.designsystem.resources.success_message
import com.fab.wab.customer.designsystem.resources.success_title
import org.jetbrains.compose.resources.stringResource

@Composable
fun AppSuccessDialog(
    onDismissRequest: () -> Unit,
    modifier: Modifier = Modifier,
    title: String = stringResource(Res.string.success_title),
    message: String = stringResource(Res.string.success_message),
    confirmButtonText: String = stringResource(Res.string.ok),
    onConfirm: () -> Unit = {},
) {
    AppFeedbackDialog(
        onDismissRequest = onDismissRequest,
        title = title,
        message = message,
        icon = AppIcons.CheckCircle,
        iconColor = LocalAppColors.current.success,
        confirmButtonText = confirmButtonText,
        onConfirm = onConfirm,
        modifier = modifier,
    )
}

@Composable
fun AppErrorDialog(
    onDismissRequest: () -> Unit,
    modifier: Modifier = Modifier,
    title: String = stringResource(Res.string.error_title),
    message: String = stringResource(Res.string.error_message),
    confirmButtonText: String = stringResource(Res.string.retry),
    onConfirm: () -> Unit = {},
) {
    AppFeedbackDialog(
        onDismissRequest = onDismissRequest,
        title = title,
        message = message,
        icon = AppIcons.Warning,
        iconColor = LocalAppColors.current.error,
        confirmButtonText = confirmButtonText,
        onConfirm = onConfirm,
        modifier = modifier,
        useOutlinedButton = true
    )
}

@Composable
fun AppFeedbackDialog(
    onDismissRequest: () -> Unit,
    title: String,
    message: String,
    icon: ImageVector,
    iconColor: Color,
    confirmButtonText: String,
    onConfirm: () -> Unit,
    modifier: Modifier = Modifier,
    useOutlinedButton: Boolean = false,
) {
    val colors = LocalAppColors.current

    Dialog(
        onDismissRequest = onDismissRequest,
        properties = DialogProperties(
            dismissOnBackPress = false,
            dismissOnClickOutside = false,
            usePlatformDefaultWidth = true
        )
    ) {
        Card(
            modifier = modifier
                .fillMaxWidth()
                .padding(horizontal = DefaultSpacingTokens.space16),
            shape = RoundedCornerShape(RadiusCard),
            colors = CardDefaults.cardColors(
                containerColor = colors.surface,
            ),
        ) {
            Column(
                modifier = Modifier
                    .padding(DefaultSpacingTokens.space32),
                horizontalAlignment = Alignment.CenterHorizontally,
            ) {
                FeedbackIcon(
                    icon = icon,
                    iconColor = iconColor,
                )

                Spacer(modifier = Modifier.height(DefaultSpacingTokens.space24))

                AppTextStyles.titleLarge(
                    text = title,
                    color = colors.onSurface,
                )

                Spacer(modifier = Modifier.height(DefaultSpacingTokens.space16))

                AppText(
                    text = message,
                    color = colors.onSurfaceVariant,
                    style = MaterialTheme.typography.bodyMedium,
                    textAlign = TextAlign.Center,
                )

                Spacer(modifier = Modifier.height(DefaultSpacingTokens.space32))

                if (useOutlinedButton) {
                    AppOutlinedButton(
                        text = confirmButtonText,
                        onClick = {
                            onConfirm()
                            onDismissRequest()
                        },
                        modifier = Modifier.fillMaxWidth()
                    )
                } else {
                    AppPrimaryTextButton(
                        text = confirmButtonText,
                        onClick = {
                            onConfirm()
                            onDismissRequest()
                        },
                        modifier = Modifier.fillMaxWidth()
                    )
                }
            }
        }
    }
}

@Composable
private fun FeedbackIcon(
    icon: ImageVector,
    iconColor: Color,
    modifier: Modifier = Modifier,
) {
    Box(
        modifier = modifier.size(80.dp),
        contentAlignment = Alignment.Center
    ) {
        // Glow effect
        Box(
            modifier = Modifier
                .size(48.dp)
                .background(iconColor.copy(alpha = 0.3f), CircleShape)
                .blur(16.dp)
        )

        // Icon background
        Box(
            modifier = Modifier
                .size(56.dp)
                .background(Color(0xFF1A211D), CircleShape),
            contentAlignment = Alignment.Center
        ) {
            Icon(
                imageVector = icon,
                contentDescription = null,
                modifier = Modifier.size(32.dp),
                tint = iconColor
            )
        }
    }
}

@Preview
@Composable
fun AppSuccessDialogPreview() {
    AppTheme() {
        AppSuccessDialog(
            onDismissRequest = {},
            onConfirm = {}
        )
    }
}

@Preview
@Composable
fun AppErrorDialogPreview() {
    AppTheme() {
        AppErrorDialog(
            onDismissRequest = {},
            onConfirm = {}
        )
    }
}
