package com.fab.wab.customer.designsystem.components.dialog

import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.RowScope
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.window.Dialog
import com.fab.wab.customer.designsystem.theme.DefaultSpacingTokens
import com.fab.wab.customer.designsystem.theme.RadiusCard

@Composable
fun AppDialog(
    onDismissRequest: () -> Unit,
    modifier: Modifier = Modifier,
    title: String? = null,
    message: String? = null,
    confirmButton: String? = null,
    dismissButton: String? = null,
    onConfirm: (() -> Unit)? = null,
    onDismiss: (() -> Unit)? = null,
) {
    Dialog(onDismissRequest = onDismissRequest) {
        Card(
            modifier = modifier.fillMaxWidth(),
            shape = RoundedCornerShape(RadiusCard),
            colors = CardDefaults.cardColors(
                containerColor = MaterialTheme.colorScheme.surface,
            ),
        ) {
            Column(
                modifier = Modifier.padding(DefaultSpacingTokens.space24),
            ) {
                if (title != null) {
                    Text(
                        text = title,
                        style = MaterialTheme.typography.titleLarge,
                        color = MaterialTheme.colorScheme.onSurface,
                    )
                    Spacer(modifier = Modifier.height(DefaultSpacingTokens.space12))
                }
                if (message != null) {
                    Text(
                        text = message,
                        style = MaterialTheme.typography.bodyMedium,
                        color = MaterialTheme.colorScheme.onSurfaceVariant,
                        textAlign = TextAlign.Start,
                    )
                    Spacer(modifier = Modifier.height(DefaultSpacingTokens.space24))
                }
                RowScope(
                    confirmButton = confirmButton,
                    dismissButton = dismissButton,
                    onConfirm = onConfirm ?: onDismissRequest,
                    onDismiss = onDismiss ?: onDismissRequest,
                )
            }
        }
    }
}

@Composable
private fun RowScope.ConfirmButton(
    text: String,
    onClick: () -> Unit,
) {
    TextButton(
        onClick = onClick,
        modifier = Modifier.weight(1f),
    ) {
        Text(
            text = text,
            color = MaterialTheme.colorScheme.primary,
        )
    }
}

@Composable
private fun RowScope.DismissButton(
    text: String,
    onClick: () -> Unit,
) {
    TextButton(
        onClick = onClick,
        modifier = Modifier.weight(1f),
    ) {
        Text(
            text = text,
            color = MaterialTheme.colorScheme.onSurfaceVariant,
        )
    }
}

@Composable
private fun RowScope(
    confirmButton: String?,
    dismissButton: String?,
    onConfirm: () -> Unit,
    onDismiss: () -> Unit,
) {
    if (confirmButton != null || dismissButton != null) {
        androidx.compose.foundation.layout.Row(
            modifier = Modifier.fillMaxWidth(),
        ) {
            if (dismissButton != null) {
                DismissButton(
                    text = dismissButton,
                    onClick = onDismiss,
                )
            }
            if (confirmButton != null && dismissButton != null) {
                Spacer(modifier = Modifier.width(DefaultSpacingTokens.space8))
            }
            if (confirmButton != null) {
                ConfirmButton(
                    text = confirmButton,
                    onClick = onConfirm,
                )
            }
        }
    }
}

@Composable
fun AppAlertDialog(
    onDismissRequest: () -> Unit,
    modifier: Modifier = Modifier,
    title: String? = null,
    message: String? = null,
    isSuccess: Boolean = false,
    confirmButton: String = "OK",
    onConfirm: (() -> Unit)? = null,
) {
    if (isSuccess) {
        AppSuccessDialog(
            onDismissRequest = onDismissRequest,
            modifier = modifier,
            title = title ?: "",
            message = message ?: "",
            confirmButtonText = confirmButton,
            onConfirm = onConfirm ?: {},
        )
    } else {
        AppErrorDialog(
            onDismissRequest = onDismissRequest,
            modifier = modifier,
            title = title ?: "",
            message = message ?: "",
            confirmButtonText = confirmButton,
            onConfirm = onConfirm ?: {},
        )
    }
}
