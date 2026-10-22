package com.fab.wab.customer.feature.home.presentation.screen

import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.WindowInsets
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.statusBars
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.layout.windowInsetsPadding
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.Icon
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.semantics.Role
import androidx.compose.ui.text.TextStyle
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.Dp
import com.fab.wab.customer.designsystem.components.button.AppIconButton
import com.fab.wab.customer.designsystem.components.shimmer.AppShimmerBox
import com.fab.wab.customer.designsystem.components.text.AppText
import com.fab.wab.customer.designsystem.icons.AppIcons
import com.fab.wab.customer.designsystem.resources.Res as DsRes
import com.fab.wab.customer.designsystem.resources.common_back
import com.fab.wab.customer.designsystem.resources.state_error_title
import com.fab.wab.customer.designsystem.resources.state_offline_message
import com.fab.wab.customer.designsystem.resources.state_offline_title
import com.fab.wab.customer.designsystem.theme.AppTheme
import com.fab.wab.customer.designsystem.utils.brandBackground
import com.fab.wab.customer.designsystem.utils.brandBrush
import com.fab.wab.customer.feature.home.presentation.resources.Res
import com.fab.wab.customer.feature.home.presentation.resources.discovery_error_server_body
import com.fab.wab.customer.feature.home.presentation.resources.discovery_retry
import org.jetbrains.compose.resources.stringResource

/** Design top bar of S04 / S06: 50 dp, back 44 dp with a 22 dp chevron at Start, centred 16 sp bold title. */
@Composable
fun DiscoveryTopBar(title: String, onBack: () -> Unit, modifier: Modifier = Modifier) {
    Box(
        modifier = modifier
            .fillMaxWidth()
            .windowInsetsPadding(WindowInsets.statusBars)
            .height(AppTheme.sizes.topBarHeight)
            .padding(horizontal = DiscoveryDesign.TOP_BAR_PADDING_H),
    ) {
        AppText(
            text = title,
            style = discoveryBody(DiscoveryDesign.TEXT_16, FontWeight.Bold),
            textAlign = TextAlign.Center,
            maxLines = 1,
            modifier = Modifier.align(Alignment.Center).fillMaxWidth().padding(horizontal = DiscoveryDesign.TOP_BAR_BACK_SIZE),
        )
        AppIconButton(
            icon = AppIcons.Back,
            contentDescription = stringResource(DsRes.string.common_back),
            onClick = onBack,
            size = DiscoveryDesign.TOP_BAR_BACK_SIZE,
            modifier = Modifier.align(Alignment.CenterStart),
        )
    }
}

/** Gradient pill button of the design placeholders (height / padding differ per state). */
@Composable
fun DiscoveryGradientButton(
    text: String,
    onClick: () -> Unit,
    height: Dp,
    paddingHorizontal: Dp,
    modifier: Modifier = Modifier,
    radius: Dp = DiscoveryDesign.PLACEHOLDER_BUTTON_RADIUS,
    textStyle: TextStyle = discoveryBody(DiscoveryDesign.TEXT_14, FontWeight.SemiBold),
) {
    Box(
        modifier = modifier
            .height(height)
            .brandBackground(brandBrush(), RoundedCornerShape(radius))
            .clickable(role = Role.Button, onClick = onClick)
            .padding(horizontal = paddingHorizontal),
        contentAlignment = Alignment.Center,
    ) {
        AppText(text = text, style = textStyle, color = AppTheme.colors.onGradient, maxLines = 1)
    }
}

/** The three full-page placeholders of the design (`ph()`): no internet, server error, empty. */
sealed interface DiscoveryPlaceholder {
    data object Offline : DiscoveryPlaceholder
    data object ServerError : DiscoveryPlaceholder
    data class Empty(val title: String, val body: String?) : DiscoveryPlaceholder
}

/** 120 dp soft circle with a 50 dp accent icon, 17 sp bold title, 13.5 sp muted body, optional Retry. */
@Composable
fun DiscoveryPlaceholderView(
    placeholder: DiscoveryPlaceholder,
    onRetry: () -> Unit,
    modifier: Modifier = Modifier,
    paddingHorizontal: Dp = AppTheme.spacing.space24,
) {
    val colors = AppTheme.colors
    val (icon, title, body) = placeholder.content()
    Column(
        modifier = modifier.fillMaxSize().padding(horizontal = paddingHorizontal, vertical = DiscoveryDesign.PLACEHOLDER_PADDING_V),
        horizontalAlignment = Alignment.CenterHorizontally,
        verticalArrangement = Arrangement.Center,
    ) {
        Box(
            modifier = Modifier.size(DiscoveryDesign.PLACEHOLDER_CIRCLE).background(colors.soft, AppTheme.shapes.circle),
            contentAlignment = Alignment.Center,
        ) {
            Icon(icon, contentDescription = null, tint = colors.accent, modifier = Modifier.size(DiscoveryDesign.PLACEHOLDER_ICON))
        }
        Spacer(Modifier.height(DiscoveryDesign.PLACEHOLDER_BODY_BOTTOM))
        AppText(text = title, style = discoveryBody(DiscoveryDesign.TEXT_17, FontWeight.Bold), textAlign = TextAlign.Center)
        Spacer(Modifier.height(AppTheme.spacing.space8))
        if (body != null) {
            AppText(
                text = body,
                style = discoveryBody(DiscoveryDesign.TEXT_13_5, lineHeight = DiscoveryDesign.LINE_HEIGHT_1_6),
                color = colors.muted,
                textAlign = TextAlign.Center,
            )
        }
        if (placeholder !is DiscoveryPlaceholder.Empty) {
            Spacer(Modifier.height(DiscoveryDesign.PLACEHOLDER_BODY_BOTTOM))
            DiscoveryGradientButton(
                text = stringResource(Res.string.discovery_retry),
                onClick = onRetry,
                height = DiscoveryDesign.PLACEHOLDER_BUTTON_HEIGHT,
                paddingHorizontal = DiscoveryDesign.PLACEHOLDER_BUTTON_PADDING_H,
            )
        }
    }
}

private data class PlaceholderContent(val icon: ImageVector, val title: String, val body: String?)

@Composable
private fun DiscoveryPlaceholder.content(): PlaceholderContent = when (this) {
    DiscoveryPlaceholder.Offline -> PlaceholderContent(
        AppIcons.Offline,
        stringResource(DsRes.string.state_offline_title),
        stringResource(DsRes.string.state_offline_message),
    )
    DiscoveryPlaceholder.ServerError -> PlaceholderContent(
        AppIcons.Error,
        stringResource(DsRes.string.state_error_title),
        stringResource(Res.string.discovery_error_server_body),
    )
    is DiscoveryPlaceholder.Empty -> PlaceholderContent(AppIcons.SearchOff, title, body)
}

/** Section title row of the design: Playfair 17 sp bold at Start, 13 sp accent action at End. */
@Composable
fun DiscoverySectionTitle(
    title: String,
    modifier: Modifier = Modifier,
    actionText: String? = null,
    onAction: (() -> Unit)? = null,
) {
    Row(
        modifier = modifier.fillMaxWidth(),
        horizontalArrangement = Arrangement.SpaceBetween,
        verticalAlignment = Alignment.CenterVertically,
    ) {
        AppText(text = title, style = discoveryHeadline(DiscoveryDesign.TEXT_17), maxLines = 1, modifier = Modifier.weight(1f))
        if (actionText != null && onAction != null) {
            AppText(
                text = actionText,
                style = discoveryBody(DiscoveryDesign.TEXT_13, FontWeight.SemiBold),
                color = AppTheme.colors.accent,
                modifier = Modifier.clickable(role = Role.Button, onClick = onAction),
            )
        }
    }
}

/** One shimmer block with the design's radius. */
@Composable
fun DiscoveryShimmer(width: Dp, height: Dp, radius: Dp, modifier: Modifier = Modifier) {
    AppShimmerBox(modifier = modifier.width(width).height(height), shape = RoundedCornerShape(radius))
}

/** A full-width shimmer block with the design's radius. */
@Composable
fun DiscoveryShimmerWide(height: Dp, radius: Dp, modifier: Modifier = Modifier) {
    AppShimmerBox(modifier = modifier.fillMaxWidth().height(height), shape = RoundedCornerShape(radius))
}
