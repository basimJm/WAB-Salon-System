package com.fab.wab.customer.feature.notifications.presentation.screen

import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.Icon
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.alpha
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.semantics.Role
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.Dp
import androidx.compose.ui.unit.TextUnit
import com.fab.wab.customer.designsystem.components.shimmer.AppShimmerBox
import com.fab.wab.customer.designsystem.components.text.AppText
import com.fab.wab.customer.designsystem.icons.AppIcons
import com.fab.wab.customer.designsystem.theme.AppTheme
import com.fab.wab.customer.designsystem.utils.brandBackground
import com.fab.wab.customer.designsystem.utils.brandBrush

/** Design `linear-gradient(135deg,#6D28D9,#A855F7)` button with an explicit height (46 retry, 52 sheet/CTA). */
@Composable
internal fun GradientButton(
    text: String,
    onClick: () -> Unit,
    modifier: Modifier = Modifier,
    height: Dp = NotificationsDesign.sheetButtonHeight,
    textSize: TextUnit = NotificationsDesign.sheetButtonTextSize,
    horizontalPadding: Dp = AppTheme.spacing.space20,
    enabled: Boolean = true,
) {
    val shape = AppTheme.shapes.medium
    Box(
        modifier = modifier
            .height(height)
            .alpha(if (enabled) 1f else AppTheme.alpha.disabled)
            .brandBackground(brandBrush(), shape)
            .clickable(enabled = enabled, role = Role.Button, onClick = onClick)
            .padding(horizontal = horizontalPadding),
        contentAlignment = Alignment.Center,
    ) {
        AppText(
            text = text,
            style = AppTheme.typography.labelLarge.copy(fontSize = textSize, fontWeight = FontWeight.SemiBold),
            color = AppTheme.colors.onGradient,
            textAlign = TextAlign.Center,
            maxLines = 1,
        )
    }
}

/** Design `border:1.5px solid var(--line);background:var(--card)` button (sheet Reset). */
@Composable
internal fun OutlineButton(text: String, onClick: () -> Unit, modifier: Modifier = Modifier) {
    val colors = AppTheme.colors
    val shape = AppTheme.shapes.medium
    Box(
        modifier = modifier
            .height(NotificationsDesign.sheetButtonHeight)
            .clip(shape)
            .background(colors.card)
            .border(AppTheme.sizes.borderWidth, colors.line, shape)
            .clickable(role = Role.Button, onClick = onClick),
        contentAlignment = Alignment.Center,
    ) {
        AppText(
            text = text,
            style = AppTheme.typography.labelLarge.copy(
                fontSize = NotificationsDesign.sheetButtonTextSize,
                fontWeight = FontWeight.SemiBold,
            ),
            color = colors.ink,
            maxLines = 1,
        )
    }
}

/** 42 px rounded icon box: soft/accent for bookings, pink container for promotions. */
@Composable
internal fun NotificationIconBox(isBooking: Boolean, modifier: Modifier = Modifier) {
    val colors = AppTheme.colors
    val background = if (isBooking) colors.soft else colors.dangerContainer
    val tint = if (isBooking) colors.accent else colors.onDangerContainer
    Box(
        modifier = modifier
            .size(NotificationsDesign.iconBox)
            .background(background, RoundedCornerShape(NotificationsDesign.iconBoxRadius)),
        contentAlignment = Alignment.Center,
    ) {
        Icon(
            imageVector = if (isBooking) AppIcons.Bookings else AppIcons.Star,
            contentDescription = null,
            tint = tint,
            modifier = Modifier.size(AppTheme.sizes.icon),
        )
    }
}

/** Empty / error placeholder: 110 px soft circle, 46 px accent icon, bold title, optional gradient action. */
@Composable
internal fun NotificationsPlaceholder(
    icon: ImageVector,
    title: String,
    modifier: Modifier = Modifier,
    actionText: String? = null,
    onAction: (() -> Unit)? = null,
) {
    val colors = AppTheme.colors
    Column(
        modifier = modifier.padding(
            PaddingValues(
                horizontal = NotificationsDesign.placeholderHorizontal,
                vertical = NotificationsDesign.placeholderVertical,
            ),
        ),
        horizontalAlignment = Alignment.CenterHorizontally,
        verticalArrangement = Arrangement.Center,
    ) {
        Box(
            modifier = Modifier
                .padding(bottom = NotificationsDesign.placeholderCircleBottom)
                .size(NotificationsDesign.placeholderCircle)
                .background(colors.soft, AppTheme.shapes.circle),
            contentAlignment = Alignment.Center,
        ) {
            Icon(icon, contentDescription = null, tint = colors.accent, modifier = Modifier.size(NotificationsDesign.placeholderIcon))
        }
        AppText(
            text = title,
            style = AppTheme.typography.titleMedium.copy(
                fontSize = NotificationsDesign.placeholderTitleSize,
                fontWeight = FontWeight.Bold,
            ),
            textAlign = TextAlign.Center,
            modifier = Modifier.padding(bottom = NotificationsDesign.placeholderTitleBottom),
        )
        if (actionText != null && onAction != null) {
            GradientButton(
                text = actionText,
                onClick = onAction,
                height = NotificationsDesign.retryHeight,
                textSize = NotificationsDesign.retryTextSize,
                horizontalPadding = NotificationsDesign.retryHorizontal,
            )
        }
    }
}

/** One shimmering row the size of a notification item. */
@Composable
internal fun NotificationShimmerRow(modifier: Modifier = Modifier) {
    AppShimmerBox(modifier = modifier.fillMaxWidth().height(NotificationsDesign.shimmerHeight), shape = AppTheme.shapes.large)
}

/** Unread marker: `background:#A855F7` = the gradient end colour. */
@Composable
internal fun UnreadDot(modifier: Modifier = Modifier) {
    Box(modifier = modifier.size(NotificationsDesign.unreadDot).background(AppTheme.colors.gradientEnd, AppTheme.shapes.circle))
}
