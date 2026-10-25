package com.fab.wab.merchant.app.ui

import androidx.compose.animation.core.Animatable
import androidx.compose.animation.core.tween
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.padding
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.remember
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.alpha
import com.fab.wab.merchant.app.controller.contract.MainContract
import com.fab.wab.merchant.app.resources.Res
import com.fab.wab.merchant.app.resources.splash_version
import com.fab.wab.merchant.app.ui.system.SystemDesign
import com.fab.wab.merchant.app.ui.system.systemHeroBrush
import com.fab.wab.merchant.designsystem.components.brand.AppBrandHeader
import com.fab.wab.merchant.designsystem.components.feedback.AppErrorState
import com.fab.wab.merchant.designsystem.components.feedback.AppLoadingIndicator
import com.fab.wab.merchant.designsystem.components.layout.AppScreen
import com.fab.wab.merchant.designsystem.components.text.AppText
import com.fab.wab.merchant.designsystem.theme.AppTheme
import org.jetbrains.compose.resources.stringResource

/**
 * Splash (PRD M01, design 01 `on.splash`): app icon 108 + WAB Business wordmark + tagline centered on the hero
 * gradient, the loader below while the config call runs, the version at the bottom; the config error with retry
 * replaces the loader.
 */
@Composable
fun SplashScreen(
    state: MainContract.UiState,
    onEvent: (MainContract.UiAction) -> Unit,
    modifier: Modifier = Modifier,
) {
    val colors = AppTheme.colors
    val fade = remember { Animatable(0f) }
    val fadeMillis = AppTheme.motion.slow
    LaunchedEffect(Unit) { fade.animateTo(1f, tween(durationMillis = fadeMillis)) }

    AppScreen(modifier = modifier.alpha(fade.value)) {
        Box(Modifier.fillMaxSize().background(systemHeroBrush()), contentAlignment = Alignment.Center) {
            Column(
                horizontalAlignment = Alignment.CenterHorizontally,
                verticalArrangement = Arrangement.spacedBy(SystemDesign.splashGap),
            ) {
                AppBrandHeader(size = SystemDesign.splashLogo)
                if (state.error == null) AppLoadingIndicator()
            }
            state.appVersion?.let { version ->
                AppText(
                    text = stringResource(Res.string.splash_version, version),
                    style = AppTheme.typography.labelMedium,
                    color = colors.faint,
                    modifier = Modifier.align(Alignment.BottomCenter).padding(bottom = SystemDesign.screenBottom),
                )
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
