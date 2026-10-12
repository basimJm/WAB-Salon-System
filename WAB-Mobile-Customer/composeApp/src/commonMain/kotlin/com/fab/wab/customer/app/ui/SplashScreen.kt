package com.fab.wab.customer.app.ui

import androidx.compose.animation.core.Animatable
import androidx.compose.animation.core.FastOutSlowInEasing
import androidx.compose.animation.core.LinearEasing
import androidx.compose.animation.core.RepeatMode
import androidx.compose.animation.core.animateFloat
import androidx.compose.animation.core.infiniteRepeatable
import androidx.compose.animation.core.rememberInfiniteTransition
import androidx.compose.animation.core.tween
import androidx.compose.foundation.Image
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.remember
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.alpha
import androidx.compose.ui.draw.scale
import androidx.compose.ui.graphics.graphicsLayer
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.unit.dp
import com.fab.wab.customer.app.controller.contract.MainContract
import com.fab.wab.customer.app.controller.state.SplashScreenState
import com.fab.wab.customer.core.ui.utils.LocalDarkTheme
import com.fab.wab.customer.designsystem.components.dialog.AppDialog
import com.fab.wab.customer.designsystem.components.feedback.AppError
import com.fab.wab.customer.designsystem.theme.LocalAppColors
import com.fab.wab.customer.designsystem.theme.LocalSpacing
import com.fab.wab.customer.app.resources.Res
import com.fab.wab.customer.app.resources.force_update_button
import com.fab.wab.customer.app.resources.force_update_message
import com.fab.wab.customer.app.resources.force_update_title
import com.fab.wab.customer.app.resources.maintenance_exit_button
import com.fab.wab.customer.app.resources.maintenance_message
import com.fab.wab.customer.app.resources.maintenance_title
import com.fab.wab.customer.app.resources.optional_update_button
import com.fab.wab.customer.app.resources.optional_update_later
import com.fab.wab.customer.app.resources.optional_update_message
import com.fab.wab.customer.app.resources.optional_update_title
import com.fab.wab.customer.designsystem.resources.ic_app_logo_dark
import com.fab.wab.customer.designsystem.resources.ic_app_logo_light
import org.jetbrains.compose.resources.painterResource
import org.jetbrains.compose.resources.stringResource
import com.fab.wab.customer.designsystem.resources.Res as CoreRes

@Composable
fun SplashScreen(
    state: SplashScreenState,
    onEvent: (MainContract.UiAction) -> Unit
) {
    val spacing = LocalSpacing.current
    val colors = LocalAppColors.current
    val isDark = LocalDarkTheme.current

    val fadeAnim = remember { Animatable(0f) }
    LaunchedEffect(Unit) {
        fadeAnim.animateTo(
            targetValue = 1f,
            animationSpec = tween(
                durationMillis = 500,
                easing = FastOutSlowInEasing
            )
        )
    }

    Box(
        modifier = Modifier
            .fillMaxSize()
            .alpha(fadeAnim.value)
            .background(colors.background),
        contentAlignment = Alignment.Center
    ) {
        Column(
            modifier = Modifier.padding(horizontal = spacing.space32),
            horizontalAlignment = Alignment.CenterHorizontally,
            verticalArrangement = Arrangement.Center
        ) {
            Box(
                modifier = Modifier.fillMaxWidth(),
                contentAlignment = Alignment.Center,
            ) {
                Image(
                    painter = painterResource(if (isDark) CoreRes.drawable.ic_app_logo_dark else CoreRes.drawable.ic_app_logo_light),
                    contentDescription = null,
                    contentScale = ContentScale.Fit,
                )
            }

            Spacer(modifier = Modifier.height(spacing.space32))

            AnimatedLoadingIndicator()

            Spacer(modifier = Modifier.height(spacing.space48))

            state.appVersion?.let { version ->
                VersionFooter(version = version)
            }
        }

        if (state.splashErrorMsg != null) {
            AppError(title = state.splashErrorMsg) {
                onEvent(MainContract.UiAction.OnRetryClicked)
            }
        }

        if (state.showUpdateDialog) {
            AppDialog(
                onDismissRequest = { /* Force update cannot be dismissed */ },
                title = stringResource(Res.string.force_update_title),
                message = stringResource(Res.string.force_update_message),
                confirmButton = stringResource(Res.string.force_update_button),
                onConfirm = { onEvent(MainContract.UiAction.OnConfirmUpdateDialog) }
            )
        }

        if (state.showOptionalUpdateDialog) {
            AppDialog(
                onDismissRequest = { onEvent(MainContract.UiAction.OnDismissUpdateDialog) },
                title = stringResource(Res.string.optional_update_title),
                message = stringResource(Res.string.optional_update_message),
                confirmButton = stringResource(Res.string.optional_update_button),
                dismissButton = stringResource(Res.string.optional_update_later),
                onConfirm = { onEvent(MainContract.UiAction.OnConfirmUpdateDialog) },
                onDismiss = { onEvent(MainContract.UiAction.OnDismissUpdateDialog) }
            )
        }

        if (state.showMaintenanceDialog) {
            AppDialog(
                onDismissRequest = { onEvent(MainContract.UiAction.OnConfirmMaintenanceDialog) },
                title = stringResource(Res.string.maintenance_title),
                message = stringResource(Res.string.maintenance_message),
                confirmButton = stringResource(Res.string.maintenance_exit_button),
                onConfirm = { onEvent(MainContract.UiAction.OnConfirmMaintenanceDialog) }
            )
        }
    }
}

@Composable
private fun AnimatedLoadingIndicator() {
    val colors = LocalAppColors.current
    val infiniteTransition = rememberInfiniteTransition(label = "loading")

    val rotation by infiniteTransition.animateFloat(
        initialValue = 0f,
        targetValue = 360f,
        animationSpec = infiniteRepeatable(
            animation = tween(durationMillis = 1200, easing = LinearEasing),
            repeatMode = RepeatMode.Restart
        ),
        label = "rotation"
    )

    val pulseScale by infiniteTransition.animateFloat(
        initialValue = 0.8f,
        targetValue = 1.2f,
        animationSpec = infiniteRepeatable(
            animation = tween(durationMillis = 800, easing = FastOutSlowInEasing),
            repeatMode = RepeatMode.Reverse
        ),
        label = "pulseScale"
    )

    Box(
        modifier = Modifier.size(56.dp),
        contentAlignment = Alignment.Center
    ) {
        CircularProgressIndicator(
            modifier = Modifier
                .fillMaxSize()
                .graphicsLayer { rotationZ = rotation },
            color = colors.primary,
            strokeWidth = 3.dp,
            trackColor = colors.primary.copy(alpha = 0.15f)
        )

        Box(
            modifier = Modifier
                .size(12.dp)
                .scale(pulseScale)
                .background(
                    color = colors.primary,
                    shape = RoundedCornerShape(percent = 50)
                )
        )
    }
}

@Composable
private fun VersionFooter(version: String) {
    val colors = LocalAppColors.current

    Text(
        text = version,
        style = MaterialTheme.typography.labelMedium,
        color = colors.secondary.copy(alpha = 0.7f)
    )
}
