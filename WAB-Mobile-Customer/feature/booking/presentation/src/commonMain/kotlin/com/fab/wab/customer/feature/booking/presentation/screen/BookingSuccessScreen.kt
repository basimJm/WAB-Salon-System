package com.fab.wab.customer.feature.booking.presentation.screen

import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.widthIn
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.verticalScroll
import androidx.compose.material3.Icon
import androidx.compose.runtime.Composable
import androidx.compose.runtime.CompositionLocalProvider
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.platform.LocalLayoutDirection
import androidx.compose.ui.semantics.Role
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.LayoutDirection
import com.fab.wab.customer.core.analytics.compose.TrackScreen
import com.fab.wab.customer.designsystem.components.button.AppPrimaryButton
import com.fab.wab.customer.designsystem.components.button.AppTextButton
import com.fab.wab.customer.designsystem.components.layout.AppScreen
import com.fab.wab.customer.designsystem.components.text.AppText
import com.fab.wab.customer.designsystem.icons.AppIcons
import com.fab.wab.customer.designsystem.theme.AppTheme
import com.fab.wab.customer.designsystem.utils.brandBackground
import com.fab.wab.customer.designsystem.utils.brandBrush
import com.fab.wab.customer.designsystem.utils.softShadow
import com.fab.wab.customer.feature.booking.presentation.analytics.BookingSuccessAnalytics
import com.fab.wab.customer.feature.booking.presentation.controller.contract.BookingSuccessContract.UiAction
import com.fab.wab.customer.feature.booking.presentation.controller.contract.BookingSuccessContract.UiState
import com.fab.wab.customer.feature.booking.presentation.resources.Res
import com.fab.wab.customer.feature.booking.presentation.resources.success_back_home
import com.fab.wab.customer.feature.booking.presentation.resources.success_copied_label
import com.fab.wab.customer.feature.booking.presentation.resources.success_copy
import com.fab.wab.customer.feature.booking.presentation.resources.success_message
import com.fab.wab.customer.feature.booking.presentation.resources.success_reference
import com.fab.wab.customer.feature.booking.presentation.resources.success_title
import com.fab.wab.customer.feature.booking.presentation.resources.success_view_booking
import org.jetbrains.compose.resources.stringResource

/**
 * S17 (`st.success`): centred column `padding:60px 28px 40px`; 120 dp radial halo around the 84 dp gradient check badge,
 * title `22px 700 margin 10 0 8`, body `14px muted max-width 290 mb 24`, dashed reference card `mb 34`,
 * gradient "View booking" (54 dp, `mb 10`) and the accent text "Back to Home" (50 dp).
 */
@Composable
fun BookingSuccessScreen(state: UiState, onAction: (UiAction) -> Unit, modifier: Modifier = Modifier) {
    TrackScreen(BookingSuccessAnalytics.SCREEN)
    val spacing = AppTheme.spacing
    val colors = AppTheme.colors
    AppScreen(modifier = modifier) { padding ->
        Column(
            modifier = Modifier
                .fillMaxSize()
                .padding(padding)
                .verticalScroll(rememberScrollState())
                .padding(
                    start = BookingDesignConstants.successSidePadding,
                    top = BookingDesignConstants.successTopPadding,
                    end = BookingDesignConstants.successSidePadding,
                    bottom = BookingDesignConstants.successBottomPadding,
                ),
            horizontalAlignment = Alignment.CenterHorizontally,
            verticalArrangement = Arrangement.Center,
        ) {
            SuccessBadge()
            AppText(
                text = stringResource(Res.string.success_title),
                modifier = Modifier.padding(top = spacing.space20, bottom = spacing.space8),
                style = AppTheme.typography.headlineMedium,
                textAlign = TextAlign.Center,
            )
            AppText(
                text = stringResource(Res.string.success_message),
                modifier = Modifier.widthIn(max = BookingDesignConstants.successBodyMaxWidth).padding(bottom = spacing.space24),
                style = AppTheme.typography.bodyMedium,
                color = colors.muted,
                textAlign = TextAlign.Center,
            )
            ReferenceCard(
                referenceNumber = state.referenceNumber,
                copied = state.copied,
                onCopy = { onAction(UiAction.OnCopyReference) },
                modifier = Modifier.padding(bottom = BookingDesignConstants.successRefGap),
            )
            Column(
                modifier = Modifier.fillMaxWidth().widthIn(max = AppTheme.sizes.sheetMaxWidth),
                verticalArrangement = Arrangement.spacedBy(spacing.space10),
            ) {
                AppPrimaryButton(
                    text = stringResource(Res.string.success_view_booking),
                    onClick = { onAction(UiAction.OnViewBooking) },
                    modifier = Modifier.fillMaxWidth(),
                )
                AppTextButton(
                    text = stringResource(Res.string.success_back_home),
                    onClick = { onAction(UiAction.OnBackHome) },
                    modifier = Modifier.fillMaxWidth().height(BookingDesignConstants.backHomeHeight),
                )
            }
        }
    }
}

/** `radial-gradient(circle, rgba(168,85,247,.22), transparent 70%)` halo + gradient circle with `0 14px 34px rgba(109,40,217,.35)`. */
@Composable
private fun SuccessBadge() {
    val colors = AppTheme.colors
    val halo = Brush.radialGradient(
        0f to colors.gradientEnd.copy(alpha = BookingDesignConstants.HALO_ALPHA),
        BookingDesignConstants.HALO_RADIUS_FRACTION to Color.Transparent,
    )
    Box(
        modifier = Modifier.size(BookingDesignConstants.successHalo).background(halo, AppTheme.shapes.circle),
        contentAlignment = Alignment.Center,
    ) {
        Box(
            modifier = Modifier
                .size(BookingDesignConstants.successBadge)
                .softShadow(
                    AppTheme.elevation.overlay,
                    colors.accent.copy(alpha = AppTheme.elevation.logoShadowAlpha),
                    AppTheme.shapes.circle,
                )
                .brandBackground(brandBrush(), AppTheme.shapes.circle),
            contentAlignment = Alignment.Center,
        ) {
            Icon(
                AppIcons.Check,
                contentDescription = null,
                tint = colors.onGradient,
                modifier = Modifier.size(BookingDesignConstants.successCheck),
            )
        }
    }
}

/**
 * Design reference card: `gap:12px;padding:12px 16px;border-radius:16px;background:var(--surface);border:1px dashed`;
 * label `11.5px muted`, number `17px 700 letter-spacing 1px` (LTR), copy button `38px / padding 0 14px / radius 10px / soft`.
 */
@Composable
private fun ReferenceCard(referenceNumber: String, copied: Boolean, onCopy: () -> Unit, modifier: Modifier = Modifier) {
    val colors = AppTheme.colors
    val spacing = AppTheme.spacing
    Row(
        modifier = modifier
            .clip(AppTheme.shapes.large)
            .background(colors.surface)
            .dashedBorder(AppTheme.sizes.hairline, colors.line, AppTheme.spacing.space16, BookingDesignConstants.dashLength)
            .padding(horizontal = spacing.space16, vertical = spacing.space12),
        horizontalArrangement = Arrangement.spacedBy(spacing.space12),
        verticalAlignment = Alignment.CenterVertically,
    ) {
        Column {
            AppText(text = stringResource(Res.string.success_reference), style = AppTheme.typography.labelSmall, color = colors.muted)
            CompositionLocalProvider(LocalLayoutDirection provides LayoutDirection.Ltr) {
                AppText(
                    text = referenceNumber,
                    style = AppTheme.typography.titleLarge.copy(letterSpacing = BookingDesignConstants.referenceLetterSpacing),
                )
            }
        }
        Box(
            modifier = Modifier
                .height(BookingDesignConstants.copyButtonHeight)
                .clip(roundedShape(BookingDesignConstants.copyButtonRadius))
                .background(colors.soft)
                .clickable(role = Role.Button, onClick = onCopy)
                .padding(horizontal = spacing.space14),
            contentAlignment = Alignment.Center,
        ) {
            AppText(
                text = stringResource(if (copied) Res.string.success_copied_label else Res.string.success_copy),
                style = AppTheme.typography.labelMedium,
                color = colors.accent,
            )
        }
    }
}
