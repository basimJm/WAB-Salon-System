package com.fab.wab.customer.designsystem.components.glass

import androidx.compose.animation.core.Spring
import androidx.compose.animation.core.animateFloatAsState
import androidx.compose.animation.core.spring
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.interaction.MutableInteractionSource
import androidx.compose.foundation.interaction.collectIsPressedAsState
import androidx.compose.runtime.Composable
import androidx.compose.runtime.Stable
import androidx.compose.runtime.State
import androidx.compose.runtime.getValue
import androidx.compose.runtime.remember
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.drawBehind
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.Path
import androidx.compose.ui.graphics.Shape
import androidx.compose.ui.graphics.addOutline
import androidx.compose.ui.graphics.drawscope.clipPath
import androidx.compose.ui.graphics.graphicsLayer
import androidx.compose.ui.graphics.isSpecified
import androidx.compose.ui.semantics.Role
import com.fab.wab.customer.designsystem.theme.AppTheme
import com.fab.wab.customer.designsystem.theme.GlassStyle
import com.fab.wab.customer.designsystem.theme.GlassTokens

/** Specular sheen: a white light falling on the upper part of the glass, fading out toward the middle. */
internal fun Modifier.glassSheen(t: GlassTokens, alpha: Float = t.sheenAlpha): Modifier = drawBehind {
    val sheen = Brush.verticalGradient(
        colors = listOf(t.highlight.copy(alpha = alpha), Color.Transparent),
        startY = 0f,
        endY = size.height * t.sheenFraction,
    )
    drawRect(sheen)
}

/** Refractive rim: the edge catches light at the top-start and bottom-end corners and stays faint on the sides. */
internal fun Modifier.glassRim(t: GlassTokens, shape: Shape): Modifier {
    val rim = Brush.linearGradient(
        colors = listOf(
            t.highlight.copy(alpha = t.rimStrongAlpha),
            t.highlight.copy(alpha = t.rimWeakAlpha),
            t.highlight.copy(alpha = t.rimWeakAlpha),
            t.highlight.copy(alpha = t.rimEndAlpha),
        ),
        start = Offset.Zero,
        end = Offset.Infinite,
    )
    return border(t.borderWidth, t.border.copy(alpha = t.borderAlpha * t.border.alpha), shape).border(t.rimWidth, rim, shape)
}

/**
 * Glass background for any element (cards, sections, fields, rows): translucent gradient body, sheen and refractive rim
 * drawn inside [shape] WITHOUT clipping the children. [stateBorder] (error, focus, selection) is drawn over the rim
 * when specified. Drop-in replacement for `.background(colors.card).border(hairline, colors.line, shape)`.
 */
fun Modifier.glassBackground(
    t: GlassTokens,
    shape: Shape,
    style: GlassStyle = GlassStyle.Regular,
    stateBorder: Color = Color.Unspecified,
): Modifier {
    val body = Brush.verticalGradient(listOf(t.fillTop(style), t.fillBottom(style)))
    val sheenAlpha = t.sheen(style)
    val glass = drawBehind {
        val outline = shape.createOutline(size, layoutDirection, this)
        clipPath(Path().apply { addOutline(outline) }) {
            drawRect(body)
            drawRect(
                Brush.verticalGradient(
                    colors = listOf(t.highlight.copy(alpha = sheenAlpha), Color.Transparent),
                    startY = 0f,
                    endY = size.height * t.sheenFraction,
                ),
            )
        }
    }.glassRim(t, shape)
    return glassShadow(t, t.level(style).elevation, shape).then(glass).then(if (stateBorder.isSpecified) Modifier.border(t.borderWidth, stateBorder, shape) else Modifier)
}

/** Press state of a glass control: drives the liquid shrink-and-spring-back. */
@Stable
class GlassPress internal constructor(val interaction: MutableInteractionSource, internal val scale: State<Float>)

/** Remembers the press state of one glass control. */
@Composable
fun rememberGlassPress(): GlassPress {
    val interaction = remember { MutableInteractionSource() }
    val pressed by interaction.collectIsPressedAsState()
    val target = if (pressed) AppTheme.glass.pressScale else 1f
    val scale = animateFloatAsState(target, spring(Spring.DampingRatioMediumBouncy, Spring.StiffnessMedium))
    return remember(interaction, scale) { GlassPress(interaction, scale) }
}

/** Scales the whole control with its press (read in the draw phase, no recomposition per frame). */
fun Modifier.glassPressScale(press: GlassPress): Modifier = graphicsLayer {
    scaleX = press.scale.value
    scaleY = press.scale.value
}

/** iOS-style tap: no ripple, the glass itself reacts through [glassPressScale]. */
fun Modifier.glassClickable(press: GlassPress, enabled: Boolean = true, role: Role = Role.Button, onClick: () -> Unit): Modifier =
    clickable(interactionSource = press.interaction, indication = null, enabled = enabled, role = role, onClick = onClick)

/** Screen backdrop: the theme background with two soft brand lights, so translucent glass reads as glass. */
fun Modifier.glassBackdrop(background: Color, t: GlassTokens): Modifier = drawBehind {
    drawRect(background)
    val radius = size.maxDimension * AMBIENT_RADIUS
    drawCircle(
        Brush.radialGradient(
            listOf(t.ambientStart.copy(alpha = t.ambientAlpha), Color.Transparent),
            center = Offset(size.width * AMBIENT_FAR, size.height * AMBIENT_NEAR),
            radius = radius,
        ),
        radius = radius,
        center = Offset(size.width * AMBIENT_FAR, size.height * AMBIENT_NEAR),
    )
    drawCircle(
        Brush.radialGradient(
            listOf(t.ambientEnd.copy(alpha = t.ambientAlpha), Color.Transparent),
            center = Offset(size.width * AMBIENT_NEAR, size.height * AMBIENT_MIDDLE),
            radius = radius,
        ),
        radius = radius,
        center = Offset(size.width * AMBIENT_NEAR, size.height * AMBIENT_MIDDLE),
    )
}

private const val AMBIENT_RADIUS = 0.6f
private const val AMBIENT_NEAR = 0.08f
private const val AMBIENT_FAR = 0.92f
private const val AMBIENT_MIDDLE = 0.62f
