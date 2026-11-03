package com.fab.wab.customer.designsystem.components.brand

import androidx.compose.foundation.Image
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Shape
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.unit.Dp
import com.fab.wab.customer.designsystem.components.text.AppText
import com.fab.wab.customer.designsystem.resources.Res
import com.fab.wab.customer.designsystem.resources.brand_name
import com.fab.wab.customer.designsystem.resources.brand_tagline
import com.fab.wab.customer.designsystem.resources.ic_app_logo_light
import com.fab.wab.customer.designsystem.theme.AppTheme
import com.fab.wab.customer.designsystem.utils.softShadow
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
 * Logo + "WAB" serif wordmark + letter-spaced tagline (S11 login, S02 nickname, S24 system screens).
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
        AppText(
            text = stringResource(Res.string.brand_name),
            style = AppTheme.typography.wordmark,
        )
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
