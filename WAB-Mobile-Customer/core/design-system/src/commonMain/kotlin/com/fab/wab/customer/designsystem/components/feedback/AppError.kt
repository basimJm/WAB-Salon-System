package com.fab.wab.customer.designsystem.components.feedback

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size

import androidx.compose.material3.Button
import androidx.compose.material3.ButtonDefaults
import androidx.compose.material3.Icon
import androidx.compose.material3.MaterialTheme
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import com.fab.wab.customer.designsystem.components.text.AppText
import com.fab.wab.customer.designsystem.components.text.AppTextStyles
import com.fab.wab.customer.designsystem.icons.AppIcons
import com.fab.wab.customer.designsystem.theme.DefaultSpacingTokens
import com.fab.wab.customer.designsystem.theme.LocalAppColors

@Composable
fun AppError(
    modifier: Modifier = Modifier,
    title: String = "Something went wrong",
    message: String = "Please try again later.",
    onRetry: (() -> Unit)? = null,
) {
    val colors = LocalAppColors.current

    Column(
        modifier = modifier
            .fillMaxSize()
            .padding(DefaultSpacingTokens.space24),
        horizontalAlignment = Alignment.CenterHorizontally,
        verticalArrangement = Arrangement.Center,
    ) {
        Icon(
            imageVector = AppIcons.Error,
            contentDescription = null,
            modifier = Modifier.size(64.dp),
            tint = colors.error,
        )
        Spacer(modifier = Modifier.height(DefaultSpacingTokens.space16))
        AppTextStyles.titleMedium(
            text = title,
            color = colors.onSurface,
        )
        Spacer(modifier = Modifier.height(DefaultSpacingTokens.space8))
        AppText(
            text = message,
            color = colors.onSurfaceVariant,
            style = MaterialTheme.typography.bodyMedium,
            textAlign = TextAlign.Center,
        )
        if (onRetry != null) {
            Spacer(modifier = Modifier.height(DefaultSpacingTokens.space24))
            Button(
                onClick = onRetry,
                colors = ButtonDefaults.buttonColors(
                    containerColor = colors.primary,
                    contentColor = colors.onPrimary
                )
            ) {
                AppTextStyles.labelLarge(
                    text = "Retry",
                    color = colors.onPrimary
                )
            }
        }
    }
}

@Composable
fun AppErrorState(
    modifier: Modifier = Modifier,
    title: String = "Error",
    message: String,
    onRetry: (() -> Unit)? = null,
) {
    AppError(
        modifier = modifier,
        title = title,
        message = message,
        onRetry = onRetry,
    )
}
