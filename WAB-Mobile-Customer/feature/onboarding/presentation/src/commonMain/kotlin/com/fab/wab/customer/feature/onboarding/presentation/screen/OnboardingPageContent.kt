package com.fab.wab.customer.feature.onboarding.presentation.screen

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material3.Icon
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.Dp
import com.fab.wab.customer.designsystem.components.text.AppText
import com.fab.wab.customer.designsystem.theme.AppTheme
import com.fab.wab.customer.designsystem.theme.HeightClass
import com.fab.wab.customer.designsystem.utils.softShadow
import com.fab.wab.customer.feature.onboarding.domain.model.OnboardingPage
import org.jetbrains.compose.resources.stringResource

/** Design `--authbg`: the hero gradient behind S01 and S02 (`heroStart → heroMiddle → heroEnd`, top to bottom). */
@Composable
internal fun onboardingHeroBrush(): Brush {
    val colors = AppTheme.colors
    return Brush.verticalGradient(listOf(colors.heroStart, colors.heroMiddle, colors.heroEnd))
}

/**
 * One S01 page: the 360 dp image slot (radius 28, violet shadow) over the centered title (25 Playfair) and text
 * (14 muted, `padding:0 12px`), gap 30, centered in the available height. Compact height (landscape phones):
 * image beside the texts.
 */
@Composable
internal fun OnboardingPageContent(page: OnboardingPage, modifier: Modifier = Modifier) {
    val visuals = page.visuals()
    val compactHeight = AppTheme.adaptive.window.heightClass == HeightClass.Compact
    val scroll = Modifier.verticalScroll(rememberScrollState())
    if (compactHeight) {
        Row(
            modifier = modifier.fillMaxSize().then(scroll),
            verticalAlignment = Alignment.CenterVertically,
            horizontalArrangement = Arrangement.spacedBy(OnboardingDesign.contentGap, Alignment.CenterHorizontally),
        ) {
            ImageSlot(visuals, OnboardingDesign.imageHeightCompact, Modifier.weight(1f))
            PageTexts(visuals, Modifier.weight(1f))
        }
    } else {
        Column(
            modifier = modifier.fillMaxSize().then(scroll),
            horizontalAlignment = Alignment.CenterHorizontally,
            verticalArrangement = Arrangement.spacedBy(OnboardingDesign.contentGap, Alignment.CenterVertically),
        ) {
            ImageSlot(visuals, OnboardingDesign.imageHeight, Modifier.fillMaxWidth())
            PageTexts(visuals)
        }
    }
}

/** `height:360px;border-radius:28px;box-shadow:0 20px 50px rgba(109,40,217,.18)`; icon placeholder until art lands. */
@Composable
private fun ImageSlot(visuals: OnboardingVisuals, height: Dp, modifier: Modifier = Modifier) {
    val colors = AppTheme.colors
    val shape = RoundedCornerShape(OnboardingDesign.imageRadius)
    Box(
        modifier = modifier
            .height(height)
            .softShadow(AppTheme.elevation.overlay, colors.gradientStart.copy(alpha = OnboardingDesign.imageShadowAlpha), shape)
            .clip(shape)
            .background(colors.soft),
        contentAlignment = Alignment.Center,
    ) {
        Icon(
            imageVector = visuals.icon,
            contentDescription = stringResource(visuals.imageDescription),
            tint = colors.accent,
            modifier = Modifier.size(OnboardingDesign.imageIcon),
        )
    }
}

@Composable
private fun PageTexts(visuals: OnboardingVisuals, modifier: Modifier = Modifier) {
    Column(modifier = modifier, horizontalAlignment = Alignment.CenterHorizontally) {
        AppText(
            text = stringResource(visuals.title),
            style = AppTheme.typography.headlineMedium.copy(
                fontSize = OnboardingDesign.titleSize,
                lineHeight = OnboardingDesign.titleLineHeight,
                fontWeight = FontWeight.Bold,
            ),
            textAlign = TextAlign.Center,
            modifier = Modifier.padding(bottom = OnboardingDesign.titleBottom),
        )
        AppText(
            text = stringResource(visuals.text),
            style = AppTheme.typography.bodyMedium.copy(fontSize = OnboardingDesign.textSize, lineHeight = OnboardingDesign.textLineHeight),
            color = AppTheme.colors.muted,
            textAlign = TextAlign.Center,
            modifier = Modifier.padding(horizontal = OnboardingDesign.textHorizontalPadding),
        )
    }
}
