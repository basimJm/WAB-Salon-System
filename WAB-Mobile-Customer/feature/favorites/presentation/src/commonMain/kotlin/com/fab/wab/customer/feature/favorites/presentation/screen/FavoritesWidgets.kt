package com.fab.wab.customer.feature.favorites.presentation.screen

import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.Icon
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.semantics.Role
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import com.fab.wab.customer.designsystem.components.shimmer.AppShimmerBox
import com.fab.wab.customer.designsystem.components.text.AppText
import com.fab.wab.customer.designsystem.theme.AppTheme
import com.fab.wab.customer.designsystem.utils.brandBackground
import com.fab.wab.customer.designsystem.utils.brandBrush

/** Guest / empty / error placeholder: 110 px soft circle, 46 px accent icon, bold title, muted body, gradient action. */
@Composable
internal fun FavoritesPlaceholder(
    icon: ImageVector,
    title: String,
    actionText: String,
    onAction: () -> Unit,
    modifier: Modifier = Modifier,
    body: String? = null,
) {
    val colors = AppTheme.colors
    Column(
        modifier = modifier.padding(horizontal = FavoritesDesign.placeholderHorizontal, vertical = FavoritesDesign.placeholderVertical),
        horizontalAlignment = Alignment.CenterHorizontally,
        verticalArrangement = Arrangement.Center,
    ) {
        Box(
            modifier = Modifier
                .padding(bottom = FavoritesDesign.placeholderCircleBottom)
                .size(FavoritesDesign.placeholderCircle)
                .background(colors.soft, AppTheme.shapes.circle),
            contentAlignment = Alignment.Center,
        ) {
            Icon(icon, contentDescription = null, tint = colors.accent, modifier = Modifier.size(FavoritesDesign.placeholderIcon))
        }
        AppText(
            text = title,
            style = AppTheme.typography.titleMedium.copy(fontSize = FavoritesDesign.placeholderTitleSize, fontWeight = FontWeight.Bold),
            textAlign = TextAlign.Center,
            modifier = Modifier.padding(bottom = FavoritesDesign.placeholderTitleBottom),
        )
        if (!body.isNullOrEmpty()) {
            AppText(
                text = body,
                style = AppTheme.typography.bodySmall.copy(
                    fontSize = FavoritesDesign.placeholderBodySize,
                    lineHeight = FavoritesDesign.placeholderBodyLineHeight,
                ),
                color = colors.muted,
                textAlign = TextAlign.Center,
                modifier = Modifier.padding(bottom = FavoritesDesign.placeholderBodyBottom),
            )
        } else {
            Box(Modifier.height(FavoritesDesign.placeholderBodyBottom))
        }
        GradientButton(text = actionText, onClick = onAction)
    }
}

/** Design `linear-gradient(135deg,#6D28D9,#A855F7)` button: `height:48px;padding:0 30px;border-radius:14px` 14/600. */
@Composable
internal fun GradientButton(text: String, onClick: () -> Unit, modifier: Modifier = Modifier) {
    Box(
        modifier = modifier
            .height(FavoritesDesign.buttonHeight)
            .brandBackground(brandBrush(), AppTheme.shapes.medium)
            .clickable(role = Role.Button, onClick = onClick)
            .padding(horizontal = FavoritesDesign.buttonHorizontal),
        contentAlignment = Alignment.Center,
    ) {
        AppText(
            text = text,
            style = AppTheme.typography.labelLarge.copy(fontSize = FavoritesDesign.buttonTextSize, fontWeight = FontWeight.SemiBold),
            color = AppTheme.colors.onGradient,
            textAlign = TextAlign.Center,
            maxLines = 1,
        )
    }
}

/** One shimmering block the size of a favorite card. */
@Composable
internal fun FavoriteShimmerCard(modifier: Modifier = Modifier) {
    AppShimmerBox(
        modifier = modifier.fillMaxWidth().height(FavoritesDesign.shimmerHeight),
        shape = RoundedCornerShape(FavoritesDesign.cardRadius),
    )
}
