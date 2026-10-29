package com.fab.wab.merchant.designsystem.components.brand

import androidx.compose.foundation.Image
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.runtime.Composable
import androidx.compose.runtime.CompositionLocalProvider
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Shape
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.platform.LocalLayoutDirection
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.Dp
import androidx.compose.ui.unit.LayoutDirection
import com.fab.wab.merchant.designsystem.components.text.AppText
import com.fab.wab.merchant.designsystem.resources.Res
import com.fab.wab.merchant.designsystem.resources.brand_business
import com.fab.wab.merchant.designsystem.resources.brand_name
import com.fab.wab.merchant.designsystem.resources.brand_tagline
import com.fab.wab.merchant.designsystem.resources.ic_app_logo_light
import com.fab.wab.merchant.designsystem.theme.AppTheme
import com.fab.wab.merchant.designsystem.utils.brandBackground
import com.fab.wab.merchant.designsystem.utils.brandBrush
import com.fab.wab.merchant.designsystem.utils.softShadow
import org.jetbrains.compose.resources.painterResource
import org.jetbrains.compose.resources.stringResource

/** The app icon as the design draws it: a rounded square (radius = 1/4 of the size) with a violet glow. */
@Composable
fun AppLogo(modifier: Modifier = Modifier, size: Dp = AppTheme.sizes.logo, shadow: Boolean = true) {
    val shape = logoShape(size)
    val glow = AppTheme.colors.gradientStart.copy(alpha = AppTheme.elevation.logoShadowAlpha)
    val shadowModifier = if (shadow) Modifier.softShadow(AppTheme.elevation.overlay, glow, shape) else Modifier
    Image(
        painter = painterResource(Res.drawable.ic_app_logo_light),
        contentDescription = stringResource(Res.string.brand_name),
        contentScale = ContentScale.Crop,
        modifier = modifier.size(size).then(shadowModifier).clip(shape),
    )
}

/**
 * Logo + "WAB" serif wordmark + letter-spaced tagline (login, nickname, system screens).
 * With [onLogoAnimationFinish] the logo is the brand Lottie ([AppAnimatedLogo]), and the callback fires once it has
 * played (launch/config screen only); without it the static icon is shown.
 */
@Composable
fun AppBrandHeader(
    modifier: Modifier = Modifier,
    size: Dp = AppTheme.sizes.logo,
    tagline: Boolean = true,
    onLogoAnimationFinish: (() -> Unit)? = null,
) {
    Column(
        modifier = modifier,
        horizontalAlignment = Alignment.CenterHorizontally,
        verticalArrangement = Arrangement.spacedBy(AppTheme.spacing.space6),
    ) {
        if (onLogoAnimationFinish != null) {
            AppAnimatedLogo(onFinish = onLogoAnimationFinish, size = size)
        } else {
            AppLogo(size = size)
        }
        Spacer(Modifier.height(AppTheme.spacing.space6))
        AppWordmark()
        if (tagline) {
            AppText(
                text = stringResource(Res.string.brand_tagline),
                style = AppTheme.typography.tagline,
                color = AppTheme.colors.gradientEnd,
            )
        }
    }
}

/** The logo tile: a rounded square, radius = 1/4 of the size. */
internal fun logoShape(size: Dp): Shape = RoundedCornerShape(size / LOGO_RADIUS_RATIO)

private const val LOGO_RADIUS_RATIO = 4

/**
 * "WAB" serif wordmark + the "Business / أعمال" pill of the merchant identity (Design Script §0.2). The pair reads
 * left to right in both languages, as in the design.
 */
@Composable
fun AppWordmark(modifier: Modifier = Modifier) {
    CompositionLocalProvider(LocalLayoutDirection provides LayoutDirection.Ltr) {
        Row(
            modifier = modifier,
            horizontalArrangement = Arrangement.spacedBy(AppTheme.spacing.space8),
            verticalAlignment = Alignment.CenterVertically,
        ) {
            AppText(text = stringResource(Res.string.brand_name), style = AppTheme.typography.wordmark)
            AppText(
                text = stringResource(Res.string.brand_business),
                style = AppTheme.typography.labelMedium.copy(fontWeight = FontWeight.Bold),
                color = AppTheme.colors.onGradient,
                modifier = Modifier
                    .brandBackground(brandBrush(), AppTheme.shapes.small)
                    .padding(horizontal = AppTheme.spacing.space10, vertical = AppTheme.spacing.space4),
            )
        }
    }
}
