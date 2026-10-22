package com.fab.wab.customer.feature.home.presentation.screen

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.size
import androidx.compose.material3.Icon
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.AnnotatedString
import androidx.compose.ui.text.SpanStyle
import androidx.compose.ui.text.TextStyle
import androidx.compose.ui.text.buildAnnotatedString
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.withStyle
import androidx.compose.ui.unit.TextUnit
import com.fab.wab.customer.designsystem.components.domain.ratingValueText
import com.fab.wab.customer.designsystem.components.text.AppText
import com.fab.wab.customer.designsystem.icons.AppIcons
import com.fab.wab.customer.designsystem.resources.Res
import com.fab.wab.customer.designsystem.resources.card_more
import com.fab.wab.customer.designsystem.theme.AppTheme
import com.fab.wab.customer.feature.home.presentation.resources.Res as HomeRes
import com.fab.wab.customer.feature.home.presentation.resources.home_reviews_count
import org.jetbrains.compose.resources.stringResource

/** Body text at a design size (Poppins / IBM Plex Sans Arabic); line height as a multiplier like the CSS `line-height`. */
@Composable
fun discoveryBody(
    size: TextUnit,
    weight: FontWeight = FontWeight.Normal,
    lineHeight: Float = DiscoveryDesign.LINE_HEIGHT_NORMAL,
): TextStyle = AppTheme.typography.bodyMedium.copy(fontSize = size, fontWeight = weight, lineHeight = size * lineHeight)

/** Headline text (Playfair Display / IBM Plex Sans Arabic, 700) at a design size. */
@Composable
fun discoveryHeadline(size: TextUnit): TextStyle =
    AppTheme.typography.headlineMedium.copy(
        fontSize = size,
        fontWeight = FontWeight.Bold,
        lineHeight = size * DiscoveryDesign.LINE_HEIGHT_NORMAL,
    )

/** `{{ desc }} <accent 600>more</accent>` on one line (design salon cards). */
@Composable
fun descriptionWithMore(description: String): AnnotatedString {
    val accent = AppTheme.colors.accent
    val more = stringResource(Res.string.card_more)
    return buildAnnotatedString {
        append(description)
        append(SPACE)
        withStyle(SpanStyle(color = accent, fontWeight = FontWeight.SemiBold)) { append(more) }
    }
}

/** `★ 4.9 (214)`: amber star, bold value, faint count in parentheses (design salon cards). */
@Composable
fun DiscoveryRatingLine(
    rating: Float,
    reviewsCount: Int,
    textSize: TextUnit,
    modifier: Modifier = Modifier,
) {
    val colors = AppTheme.colors
    val style = discoveryBody(textSize, FontWeight.Bold)
    val faintCount = buildAnnotatedString {
        withStyle(SpanStyle(color = colors.faint, fontWeight = FontWeight.Medium)) {
            append(stringResource(HomeRes.string.home_reviews_count, reviewsCount))
        }
    }
    Row(
        modifier = modifier,
        horizontalArrangement = Arrangement.spacedBy(DiscoveryDesign.RATING_GAP),
        verticalAlignment = Alignment.CenterVertically,
    ) {
        Icon(AppIcons.Star, contentDescription = null, tint = colors.warning, modifier = Modifier.size(DiscoveryDesign.STAR_ICON))
        AppText(text = ratingValueText(rating), style = style, maxLines = 1)
        AppText(text = faintCount, style = style, maxLines = 1)
    }
}

private const val SPACE = " "
