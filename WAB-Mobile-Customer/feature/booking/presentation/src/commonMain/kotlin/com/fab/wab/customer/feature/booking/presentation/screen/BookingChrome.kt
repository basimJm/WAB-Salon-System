package com.fab.wab.customer.feature.booking.presentation.screen

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.WindowInsets
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.navigationBars
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.statusBars
import androidx.compose.foundation.layout.windowInsetsPadding
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.style.TextAlign
import com.fab.wab.customer.designsystem.components.button.AppIconButton
import com.fab.wab.customer.designsystem.components.text.AppText
import com.fab.wab.customer.designsystem.icons.AppIcons
import com.fab.wab.customer.designsystem.resources.Res as CoreRes
import com.fab.wab.customer.designsystem.resources.common_back
import com.fab.wab.customer.designsystem.theme.AppTheme
import com.fab.wab.customer.designsystem.utils.brandBackground
import com.fab.wab.customer.designsystem.utils.brandBrush
import com.fab.wab.customer.feature.booking.presentation.controller.contract.BookingStep
import org.jetbrains.compose.resources.stringResource

/**
 * Design header: `height:52px;padding:0 12px`, 44 dp back button at Start (mirrors in RTL), centred two-line title
 * (`font-weight:700;font-size:15.5px` + `11.5px var(--muted)` salon name) laid over the full width.
 */
@Composable
internal fun BookingHeader(title: String, subtitle: String, onBack: () -> Unit, modifier: Modifier = Modifier) {
    Box(
        modifier = modifier
            .fillMaxWidth()
            .windowInsetsPadding(WindowInsets.statusBars)
            .height(BookingDesignConstants.headerHeight)
            .padding(horizontal = AppTheme.spacing.space12),
    ) {
        AppIconButton(
            icon = AppIcons.Back,
            contentDescription = stringResource(CoreRes.string.common_back),
            onClick = onBack,
            modifier = Modifier.align(Alignment.CenterStart),
            size = BookingDesignConstants.backButton,
        )
        Column(
            modifier = Modifier.fillMaxSize().padding(horizontal = BookingDesignConstants.backButton),
            horizontalAlignment = Alignment.CenterHorizontally,
            verticalArrangement = Arrangement.Center,
        ) {
            AppText(text = title, style = AppTheme.typography.titleMedium, textAlign = TextAlign.Center, maxLines = 1)
            if (subtitle.isNotEmpty()) {
                AppText(
                    text = subtitle,
                    style = AppTheme.typography.labelSmall,
                    color = AppTheme.colors.muted,
                    textAlign = TextAlign.Center,
                    maxLines = 1,
                )
            }
        }
    }
}

/**
 * Design `stepBars`: six `flex:1;height:4px;border-radius:2px` bars with `gap:5px`, gradient up to the current step,
 * `margin-bottom:8px`, then `font-size:12px`: step label `700 accent` at Start and the person label `muted` at End.
 */
@Composable
internal fun BookingProgress(current: Int, stepLabel: String, personLabel: String, modifier: Modifier = Modifier) {
    val colors = AppTheme.colors
    val shape = roundedShape(BookingDesignConstants.stepBarRadius)
    val brush = brandBrush()
    Column(modifier = modifier.fillMaxWidth(), verticalArrangement = Arrangement.spacedBy(AppTheme.spacing.space8)) {
        Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(BookingDesignConstants.stepBarGap)) {
            repeat(BookingStep.entries.size) { index ->
                val bar = Modifier.weight(1f).height(BookingDesignConstants.stepBarHeight)
                Box(if (index <= current) bar.brandBackground(brush, shape) else bar.background(colors.line, shape))
            }
        }
        Row(
            modifier = Modifier.fillMaxWidth(),
            horizontalArrangement = Arrangement.SpaceBetween,
            verticalAlignment = Alignment.CenterVertically,
        ) {
            AppText(text = stepLabel, style = AppTheme.typography.labelMedium, color = colors.accent, maxLines = 1)
            AppText(
                text = personLabel,
                modifier = Modifier.padding(start = AppTheme.spacing.space8),
                style = AppTheme.typography.bodySmall,
                color = colors.muted,
                maxLines = 1,
            )
        }
    }
}

/** Design sticky bar: `padding:12px 20px 30px;border-top:1px solid var(--line);background:var(--card)` above the nav bar. */
@Composable
internal fun BookingActionBar(modifier: Modifier = Modifier, content: @Composable () -> Unit) {
    val colors = AppTheme.colors
    Column(modifier = modifier.fillMaxWidth().background(colors.card).windowInsetsPadding(WindowInsets.navigationBars)) {
        Box(Modifier.fillMaxWidth().height(AppTheme.sizes.hairline).background(colors.line))
        Box(
            modifier = Modifier.fillMaxWidth().padding(
                start = AppTheme.spacing.space20,
                top = AppTheme.spacing.space12,
                end = AppTheme.spacing.space20,
                bottom = AppTheme.spacing.space20,
            ),
        ) {
            content()
        }
    }
}
