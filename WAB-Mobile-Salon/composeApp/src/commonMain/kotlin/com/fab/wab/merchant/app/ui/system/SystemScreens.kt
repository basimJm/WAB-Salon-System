package com.fab.wab.merchant.app.ui.system

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.widthIn
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.verticalScroll
import androidx.compose.material3.Icon
import androidx.compose.runtime.Composable
import androidx.compose.runtime.CompositionLocalProvider
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.platform.LocalLayoutDirection
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.LayoutDirection
import com.fab.wab.merchant.app.resources.Res
import com.fab.wab.merchant.app.resources.force_update_button
import com.fab.wab.merchant.app.resources.force_update_message
import com.fab.wab.merchant.app.resources.force_update_title
import com.fab.wab.merchant.app.resources.maintenance_message
import com.fab.wab.merchant.app.resources.maintenance_retry_button
import com.fab.wab.merchant.app.resources.maintenance_title
import com.fab.wab.merchant.designsystem.components.brand.AppLogo
import com.fab.wab.merchant.designsystem.components.brand.AppWordmark
import com.fab.wab.merchant.designsystem.components.button.AppPrimaryButton
import com.fab.wab.merchant.designsystem.components.layout.AppScreen
import com.fab.wab.merchant.designsystem.components.text.AppText
import com.fab.wab.merchant.designsystem.icons.AppIcons
import com.fab.wab.merchant.designsystem.theme.AppTheme
import org.jetbrains.compose.resources.stringResource

/** Design `--authbg`: the hero gradient behind the system screens (`heroStart → heroMiddle → heroEnd`). */
@Composable
internal fun systemHeroBrush(): Brush {
    val colors = AppTheme.colors
    return Brush.verticalGradient(listOf(colors.heroStart, colors.heroMiddle, colors.heroEnd))
}

/** M26 force update (`on.force`): blocking, download icon, the only action opens the store. */
@Composable
fun ForceUpdateScreen(onUpdate: () -> Unit, modifier: Modifier = Modifier) {
    SystemScreen(
        title = stringResource(Res.string.force_update_title),
        message = stringResource(Res.string.force_update_message),
        actionText = stringResource(Res.string.force_update_button),
        onAction = onUpdate,
        modifier = modifier,
        icon = AppIcons.Download,
    )
}

/** M26 maintenance (`on.maint`): blocking, wrench icon, the server message when it sends one, retry re-runs the config call. */
@Composable
fun MaintenanceScreen(message: String?, onRetry: () -> Unit, modifier: Modifier = Modifier) {
    SystemScreen(
        title = stringResource(Res.string.maintenance_title),
        message = message ?: stringResource(Res.string.maintenance_message),
        actionText = stringResource(Res.string.maintenance_retry_button),
        onAction = onRetry,
        modifier = modifier,
        icon = AppIcons.Maintenance,
    )
}

/**
 * `on.sys` as in `design/WAB Merchant 01 Onboarding.dc.html`: hero gradient, `padding:60px 32px 40px`, everything centered:
 * icon 44 + WAB Business wordmark in one row (margin-bottom 40), 110 dp soft circle with a 46 dp accent icon (margin-bottom 26),
 * title 23 Playfair (margin-bottom 10), body 14 muted (margin-bottom 34), full-width gradient button.
 */
@Composable
private fun SystemScreen(
    title: String,
    message: String,
    actionText: String,
    onAction: () -> Unit,
    icon: ImageVector,
    modifier: Modifier = Modifier,
) {
    val colors = AppTheme.colors
    AppScreen(modifier = modifier) {
        Box(Modifier.fillMaxSize().background(systemHeroBrush()), contentAlignment = Alignment.Center) {
            Column(
                modifier = Modifier
                    .fillMaxWidth()
                    .widthIn(max = AppTheme.sizes.sheetMaxWidth)
                    .verticalScroll(rememberScrollState())
                    .padding(
                        start = SystemDesign.screenHorizontal,
                        end = SystemDesign.screenHorizontal,
                        top = SystemDesign.screenTop,
                        bottom = SystemDesign.screenBottom,
                    ),
                horizontalAlignment = Alignment.CenterHorizontally,
                verticalArrangement = Arrangement.Center,
            ) {
                CompositionLocalProvider(LocalLayoutDirection provides LayoutDirection.Ltr) {
                    Row(
                        modifier = Modifier.padding(bottom = SystemDesign.logoBottom),
                        verticalAlignment = Alignment.CenterVertically,
                        horizontalArrangement = Arrangement.spacedBy(AppTheme.spacing.space8),
                    ) {
                        AppLogo(size = SystemDesign.logo, shadow = false)
                        AppWordmark()
                    }
                }
                Box(
                    modifier = Modifier
                        .padding(bottom = SystemDesign.circleBottom)
                        .size(SystemDesign.circle)
                        .background(colors.soft, AppTheme.shapes.circle),
                    contentAlignment = Alignment.Center,
                ) {
                    Icon(icon, contentDescription = null, tint = colors.accent, modifier = Modifier.size(SystemDesign.icon))
                }
                AppText(
                    text = title,
                    style = AppTheme.typography.headlineMedium.copy(
                        fontSize = SystemDesign.titleSize,
                        lineHeight = SystemDesign.titleLineHeight,
                        fontWeight = FontWeight.Bold,
                    ),
                    textAlign = TextAlign.Center,
                    modifier = Modifier.padding(bottom = SystemDesign.titleBottom),
                )
                AppText(
                    text = message,
                    style = AppTheme.typography.bodyMedium.copy(fontSize = SystemDesign.bodySize, lineHeight = SystemDesign.bodyLineHeight),
                    color = colors.muted,
                    textAlign = TextAlign.Center,
                    modifier = Modifier.padding(bottom = SystemDesign.bodyBottom),
                )
                AppPrimaryButton(text = actionText, onClick = onAction, modifier = Modifier.fillMaxWidth())
            }
        }
    }
}
