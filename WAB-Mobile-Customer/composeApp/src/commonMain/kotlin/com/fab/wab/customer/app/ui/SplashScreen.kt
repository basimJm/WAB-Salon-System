package com.fab.wab.customer.app.ui

import androidx.compose.animation.core.Animatable
import androidx.compose.animation.core.tween
import androidx.compose.foundation.Image
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.size
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.remember
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.alpha
import androidx.compose.ui.layout.ContentScale
import com.fab.wab.customer.app.controller.contract.MainContract
import com.fab.wab.customer.app.resources.Res
import com.fab.wab.customer.app.resources.splash_version
import com.fab.wab.customer.core.ui.utils.LocalDarkTheme
import com.fab.wab.customer.designsystem.components.feedback.AppErrorState
import com.fab.wab.customer.designsystem.components.feedback.AppLoadingIndicator
import com.fab.wab.customer.designsystem.components.layout.AppScreen
import com.fab.wab.customer.designsystem.components.text.AppText
import com.fab.wab.customer.designsystem.theme.AppTheme
import org.jetbrains.compose.resources.painterResource
import org.jetbrains.compose.resources.stringResource
import com.fab.wab.customer.designsystem.resources.Res as CoreRes
import com.fab.wab.customer.designsystem.resources.ic_app_logo_dark
import com.fab.wab.customer.designsystem.resources.ic_app_logo_light

/** Logo + loader while the config call runs; the config error with retry replaces the loader (PRD §4.2). */
@Composable
fun SplashScreen(
    state: MainContract.UiState,
    onEvent: (MainContract.UiAction) -> Unit,
    modifier: Modifier = Modifier,
) {
    val colors = AppTheme.colors
    val logo = if (LocalDarkTheme.current) CoreRes.drawable.ic_app_logo_dark else CoreRes.drawable.ic_app_logo_light
    val fade = remember { Animatable(0f) }
    val fadeMillis = AppTheme.motion.slow
    LaunchedEffect(Unit) { fade.animateTo(1f, tween(durationMillis = fadeMillis)) }

    AppScreen(modifier = modifier.alpha(fade.value).background(colors.background)) {
        Box(Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
            Column(
                horizontalAlignment = Alignment.CenterHorizontally,
                verticalArrangement = Arrangement.spacedBy(AppTheme.spacing.space32),
            ) {
                Image(
                    painter = painterResource(logo),
                    contentDescription = null,
                    contentScale = ContentScale.Fit,
                    modifier = Modifier.size(AppTheme.sizes.splashLogo),
                )
                if (state.error == null) AppLoadingIndicator()
                state.appVersion?.let { version ->
                    AppText(
                        text = stringResource(Res.string.splash_version, version),
                        style = AppTheme.typography.labelMedium,
                        color = colors.faint,
                    )
                }
            }
            if (state.error != null) {
                AppErrorState(
                    message = state.error,
                    onRetry = { onEvent(MainContract.UiAction.OnRetryClicked) },
                    modifier = Modifier.background(colors.background),
                )
            }
        }
    }
}
