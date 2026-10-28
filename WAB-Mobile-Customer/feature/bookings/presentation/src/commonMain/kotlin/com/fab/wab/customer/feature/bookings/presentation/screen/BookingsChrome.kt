package com.fab.wab.customer.feature.bookings.presentation.screen

import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.defaultMinSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.Icon
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.draw.drawWithCache
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.PathEffect
import androidx.compose.ui.graphics.Shape
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.semantics.Role
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.Dp
import androidx.compose.ui.unit.TextUnit
import com.fab.wab.customer.designsystem.components.avatar.initialsOf
import com.fab.wab.customer.designsystem.components.image.AppImage
import com.fab.wab.customer.designsystem.components.shimmer.AppShimmerBox
import com.fab.wab.customer.designsystem.components.text.AppText
import com.fab.wab.customer.designsystem.theme.AppTheme
import com.fab.wab.customer.designsystem.utils.brandBackground
import com.fab.wab.customer.designsystem.utils.brandBrush

/** Design: `border-radius:18px` cards of S14/S15/S18. */
internal val bookingCardShape: Shape get() = RoundedCornerShape(BookingsDesign.cardRadius)

/** Design: `width:52px;height:52px;border-radius:14px` salon image; initials on the soft surface when no image. */
@Composable
internal fun SalonThumb(
    name: String,
    imageUrl: String?,
    modifier: Modifier = Modifier,
    size: Dp = BookingsDesign.salonThumb,
    shape: Shape = AppTheme.shapes.medium,
) {
    Box(modifier = modifier.size(size).clip(shape).background(AppTheme.colors.soft), contentAlignment = Alignment.Center) {
        if (imageUrl != null) {
            AppImage(url = imageUrl, modifier = Modifier.size(size))
        } else {
            AppText(text = initialsOf(name), style = AppTheme.typography.titleMedium, color = AppTheme.colors.accent, maxLines = 1)
        }
    }
}

/** Design: gradient pill button (`height`, `padding:0 X`, radius 14, white 600 text). */
@Composable
internal fun GradientButton(
    text: String,
    onClick: () -> Unit,
    modifier: Modifier = Modifier,
    height: Dp = BookingsDesign.placeholderButtonHeight,
    horizontalPadding: Dp = BookingsDesign.placeholderButtonPadding,
    fontSize: TextUnit = AppTheme.typography.bodyMedium.fontSize,
    enabled: Boolean = true,
    leadingIcon: ImageVector? = null,
) {
    val shape = AppTheme.shapes.medium
    val background = if (enabled) Modifier.brandBackground(brandBrush(), shape) else Modifier.clip(shape).background(AppTheme.colors.soft)
    val content = if (enabled) AppTheme.colors.onGradient else AppTheme.colors.faint
    Row(
        modifier = modifier
            .height(height)
            .then(background)
            .clickable(enabled = enabled, role = Role.Button, onClick = onClick)
            .padding(horizontal = horizontalPadding),
        horizontalArrangement = Arrangement.spacedBy(AppTheme.spacing.space6, Alignment.CenterHorizontally),
        verticalAlignment = Alignment.CenterVertically,
    ) {
        if (leadingIcon != null) Icon(leadingIcon, contentDescription = null, tint = content, modifier = Modifier.size(AppTheme.sizes.icon))
        AppText(
            text = text,
            style = AppTheme.typography.labelLarge.copy(fontSize = fontSize),
            color = content,
            maxLines = 1,
            textAlign = TextAlign.Center,
        )
    }
}

/** Design: soft-surface circle with an accent icon, bold title, muted body and an optional gradient action (S14 / S15 placeholders). */
@Composable
internal fun BookingsPlaceholder(
    icon: ImageVector,
    title: String,
    modifier: Modifier = Modifier,
    body: String? = null,
    actionText: String? = null,
    onAction: (() -> Unit)? = null,
    spec: PlaceholderSpec = BookingsDesign.listPlaceholder,
) {
    val colors = AppTheme.colors
    val spacing = AppTheme.spacing
    Column(
        modifier = modifier.padding(horizontal = spec.horizontalPadding, vertical = BookingsDesign.placeholderVerticalPadding),
        horizontalAlignment = Alignment.CenterHorizontally,
        verticalArrangement = Arrangement.Center,
    ) {
        Box(
            modifier = Modifier.size(spec.circle).background(colors.soft, AppTheme.shapes.circle),
            contentAlignment = Alignment.Center,
        ) {
            Icon(icon, contentDescription = null, tint = colors.accent, modifier = Modifier.size(spec.icon))
        }
        AppText(
            text = title,
            style = AppTheme.typography.titleMedium.copy(fontSize = spec.title, fontWeight = FontWeight.Bold),
            textAlign = TextAlign.Center,
            modifier = Modifier.padding(top = spacing.space20, bottom = spacing.space8),
        )
        if (body != null) {
            AppText(
                text = body,
                style = AppTheme.typography.bodyMedium.copy(fontSize = spec.body, lineHeight = BookingsDesign.lineHeightBodyPlus),
                color = colors.muted,
                textAlign = TextAlign.Center,
            )
        }
        if (actionText != null && onAction != null) {
            GradientButton(
                text = actionText,
                onClick = onAction,
                modifier = Modifier.padding(top = spacing.space20),
                height = spec.buttonHeight,
                horizontalPadding = spec.buttonPadding,
            )
        }
    }
}

/** Design: `border-radius:18px` shimmer block of a given height. */
@Composable
internal fun BookingsShimmerCard(height: Dp, modifier: Modifier = Modifier) {
    AppShimmerBox(modifier = modifier.fillMaxWidth().height(height), shape = bookingCardShape)
}

/** Design: `border-top:1px dashed var(--line)` separators inside person and payment cards. */
internal fun Modifier.dashedTopBorder(color: Color, width: Dp): Modifier = drawWithCache {
    // CUS-097: dash effect and end points built once per size, not on every frame of a scroll.
    val stroke = width.toPx()
    val start = Offset(0f, stroke / BookingsDesign.strokeCenterDivisor)
    val end = Offset(size.width, stroke / BookingsDesign.strokeCenterDivisor)
    val dash = PathEffect.dashPathEffect(floatArrayOf(BookingsDesign.dashLength, BookingsDesign.dashGap))
    onDrawBehind { drawLine(color = color, start = start, end = end, strokeWidth = stroke, pathEffect = dash) }
}

/** Design: `width:42px;height:42px;border-radius:12px` tinted icon button (Call / WhatsApp on S15). */
@Composable
internal fun TintedIconButton(
    icon: ImageVector,
    contentDescription: String,
    container: Color,
    tint: Color,
    onClick: () -> Unit,
    modifier: Modifier = Modifier,
) {
    Box(
        modifier = modifier
            .defaultMinSize(minWidth = AppTheme.sizes.touchTarget, minHeight = AppTheme.sizes.touchTarget)
            .clickable(role = Role.Button, onClick = onClick),
        contentAlignment = Alignment.Center,
    ) {
        Box(
            modifier = Modifier
                .size(BookingsDesign.contactButton)
                .background(container, RoundedCornerShape(BookingsDesign.contactButtonRadius)),
            contentAlignment = Alignment.Center,
        ) {
            Icon(icon, contentDescription = contentDescription, tint = tint, modifier = Modifier.size(BookingsDesign.contactIcon))
        }
    }
}

/** Design: bordered (`1px solid var(--line)`) or surface-filled 18 px card with 14 px padding and no shadow. */
@Composable
internal fun DesignCard(
    modifier: Modifier = Modifier,
    filled: Boolean = false,
    contentPadding: Dp = AppTheme.spacing.space14,
    content: @Composable () -> Unit,
) {
    val colors = AppTheme.colors
    val shape = bookingCardShape
    val surface = if (filled) Modifier.background(colors.surface, shape) else Modifier.border(AppTheme.sizes.hairline, colors.line, shape)
    Box(modifier = modifier.fillMaxWidth().then(surface).padding(contentPadding)) { content() }
}
