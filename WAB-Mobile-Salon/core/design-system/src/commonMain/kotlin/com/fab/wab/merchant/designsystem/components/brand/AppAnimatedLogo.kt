package com.fab.wab.merchant.designsystem.components.brand

import androidx.compose.foundation.Image
import androidx.compose.foundation.layout.size
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.rememberUpdatedState
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.unit.Dp
import com.fab.wab.merchant.designsystem.resources.Res
import com.fab.wab.merchant.designsystem.resources.brand_name
import com.fab.wab.merchant.designsystem.theme.AppTheme
import io.github.alexzhirkevich.compottie.LottieCompositionSpec
import io.github.alexzhirkevich.compottie.animateLottieCompositionAsState
import io.github.alexzhirkevich.compottie.rememberLottieComposition
import io.github.alexzhirkevich.compottie.rememberLottiePainter
import org.jetbrains.compose.resources.ExperimentalResourceApi
import org.jetbrains.compose.resources.stringResource
import kotlin.time.Duration
import kotlin.time.Duration.Companion.milliseconds

/**
 * The brand logo as the owner's Lottie animation (`files/wab_logo_splash.json`), played once in
 * `AppTheme.motion.logoReveal` (sped up from the file's own length) and held on its last frame, then [onFinish] fires.
 * Same tile as [AppLogo] (size, rounded corners). Until the composition is parsed (off the main thread) the static
 * [AppLogo] is shown, so the slot never flashes empty; if the file cannot be read, [onFinish] fires at once so the
 * caller never waits on a broken animation.
 */
@OptIn(ExperimentalResourceApi::class)
@Composable
fun AppAnimatedLogo(onFinish: () -> Unit, modifier: Modifier = Modifier, size: Dp = AppTheme.sizes.logo) {
    val result = rememberLottieComposition {
        LottieCompositionSpec.JsonString(Res.readBytes(LOGO_ANIMATION_FILE).decodeToString())
    }
    val composition = result.value
    val target = AppTheme.motion.logoReveal.milliseconds
    val animation = animateLottieCompositionAsState(
        composition = composition,
        iterations = PLAY_ONCE,
        speed = composition?.let { logoAnimationSpeed(it.duration, target) } ?: 1f,
    )
    val finish by rememberUpdatedState(onFinish)
    val done = result.isFailure || animation.isAtEnd
    LaunchedEffect(done) { if (done) finish() }

    Image(
        painter = rememberLottiePainter(composition = composition, progress = { animation.progress }),
        contentDescription = stringResource(Res.string.brand_name),
        modifier = modifier.size(size).clip(logoShape(size)),
    )
}

/** Playback speed that fits an animation of [source] length into [target]; 1 (as authored) when either is not positive. */
internal fun logoAnimationSpeed(source: Duration, target: Duration): Float =
    if (source.isPositive() && target.isPositive()) (source / target).toFloat() else 1f

private const val LOGO_ANIMATION_FILE = "files/wab_logo_splash.json"
private const val PLAY_ONCE = 1
