package com.fab.wab.customer.feature.salons.presentation.screen

import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.WindowInsets
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.navigationBars
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.statusBars
import androidx.compose.foundation.layout.windowInsetsPadding
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.verticalScroll
import androidx.compose.material3.Icon
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.alpha
import androidx.compose.ui.semantics.Role
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.window.Dialog
import androidx.compose.ui.window.DialogProperties
import com.fab.wab.customer.core.analytics.compose.TrackScreen
import com.fab.wab.customer.designsystem.components.button.AppPrimaryButton
import com.fab.wab.customer.designsystem.components.text.AppText
import com.fab.wab.customer.designsystem.icons.AppIcons
import com.fab.wab.customer.designsystem.resources.Res as DsRes
import com.fab.wab.customer.designsystem.resources.state_error_title
import com.fab.wab.customer.designsystem.theme.AppTheme
import com.fab.wab.customer.feature.home.presentation.screen.DiscoveryDesign
import com.fab.wab.customer.feature.home.presentation.screen.DiscoveryGradientButton
import com.fab.wab.customer.feature.home.presentation.screen.discoveryBody
import com.fab.wab.customer.feature.salons.presentation.analytics.SalonsAnalytics
import com.fab.wab.customer.feature.salons.presentation.controller.contract.FilterSheetContract.UiAction
import com.fab.wab.customer.feature.salons.presentation.controller.contract.FilterSheetContract.UiState
import com.fab.wab.customer.feature.salons.presentation.resources.Res
import com.fab.wab.customer.feature.salons.presentation.resources.filter_apply
import com.fab.wab.customer.feature.salons.presentation.resources.filter_close
import com.fab.wab.customer.feature.salons.presentation.resources.filter_reset
import com.fab.wab.customer.feature.salons.presentation.resources.filter_retry
import com.fab.wab.customer.feature.salons.presentation.resources.filter_title
import org.jetbrains.compose.resources.stringResource

/** S05 (design `filterOpen`): full-screen sheet with header (close / title / reset), scrolling sections, sticky Apply. */
@Composable
fun FilterSheet(state: UiState, onAction: (UiAction) -> Unit, onDismiss: () -> Unit, modifier: Modifier = Modifier) {
    TrackScreen(SalonsAnalytics.FILTER_SCREEN)
    val spacing = AppTheme.spacing
    val colors = AppTheme.colors
    Dialog(
        onDismissRequest = onDismiss,
        properties = DialogProperties(dismissOnBackPress = true, dismissOnClickOutside = false, usePlatformDefaultWidth = false),
    ) {
        Column(modifier = modifier.fillMaxSize().background(colors.background).windowInsetsPadding(WindowInsets.statusBars)) {
            SheetHeader(state.canReset, onAction, onDismiss)
            Column(
                modifier = Modifier
                    .weight(1f)
                    .verticalScroll(rememberScrollState())
                    .padding(
                        start = spacing.space20,
                        end = spacing.space20,
                        top = SalonsDesign.SHEET_BODY_PADDING_TOP,
                        bottom = spacing.space20,
                    ),
            ) {
                FilterBusinessTypeSection(state, onAction)
                FilterGenderSection(state, onAction)
                when {
                    state.servicesLoading && state.services.isEmpty() && state.servicesError == null -> FilterChipsShimmer()
                    state.servicesError != null && state.services.isEmpty() -> FilterError(onRetry = { onAction(UiAction.OnRetryServices) })
                    else -> {
                        FilterServicesSection(state, onAction)
                        if (state.showPrice) FilterPriceSection(state, onAction)
                        FilterGeneralSection(state, onAction)
                        FilterRatingSection(state, onAction)
                    }
                }
            }
            SheetFooter(onApply = { onAction(UiAction.OnApply) })
        }
    }
}

/** 50 dp row with a hairline below: 44 dp "✕" at Start, centred 16 sp bold title, Reset (accent, or faint at 60 %). */
@Composable
private fun SheetHeader(canReset: Boolean, onAction: (UiAction) -> Unit, onDismiss: () -> Unit) {
    val colors = AppTheme.colors
    Column {
        Box(Modifier.fillMaxWidth().height(AppTheme.sizes.topBarHeight).padding(horizontal = DiscoveryDesign.TOP_BAR_PADDING_H)) {
            AppText(
                text = stringResource(Res.string.filter_title),
                style = discoveryBody(DiscoveryDesign.TEXT_16, FontWeight.Bold),
                textAlign = TextAlign.Center,
                maxLines = 1,
                modifier = Modifier.align(Alignment.Center).fillMaxWidth().padding(horizontal = DiscoveryDesign.TOP_BAR_BACK_SIZE),
            )
            Box(
                modifier = Modifier
                    .align(Alignment.CenterStart)
                    .size(DiscoveryDesign.TOP_BAR_BACK_SIZE)
                    .clickable(role = Role.Button, onClick = onDismiss),
                contentAlignment = Alignment.Center,
            ) {
                Icon(
                    imageVector = AppIcons.Close,
                    contentDescription = stringResource(Res.string.filter_close),
                    tint = colors.ink,
                    modifier = Modifier.size(SalonsDesign.CLOSE_ICON),
                )
            }
            AppText(
                text = stringResource(Res.string.filter_reset),
                style = discoveryBody(DiscoveryDesign.TEXT_14, FontWeight.SemiBold),
                color = if (canReset) colors.accent else colors.faint,
                maxLines = 1,
                modifier = Modifier
                    .align(Alignment.CenterEnd)
                    .alpha(if (canReset) 1f else SalonsDesign.RESET_DISABLED_ALPHA)
                    .clickable(enabled = canReset, role = Role.Button, onClick = { onAction(UiAction.OnReset) })
                    .padding(horizontal = AppTheme.spacing.space8, vertical = AppTheme.spacing.space10),
            )
        }
        Box(Modifier.fillMaxWidth().height(AppTheme.sizes.hairline).background(colors.line))
    }
}

/** Design `fError`: 100 dp soft circle with a 42 dp warning icon, 16 sp bold title, 46 dp gradient Retry. */
@Composable
private fun FilterError(onRetry: () -> Unit) {
    val colors = AppTheme.colors
    Column(
        modifier = Modifier.fillMaxWidth().padding(horizontal = AppTheme.spacing.space20, vertical = SalonsDesign.ERROR_PADDING_V),
        horizontalAlignment = Alignment.CenterHorizontally,
    ) {
        Box(Modifier.size(SalonsDesign.ERROR_CIRCLE).background(colors.soft, AppTheme.shapes.circle), contentAlignment = Alignment.Center) {
            Icon(AppIcons.Error, contentDescription = null, tint = colors.accent, modifier = Modifier.size(SalonsDesign.ERROR_ICON))
        }
        Spacer(Modifier.height(SalonsDesign.ERROR_TITLE_BOTTOM))
        AppText(
            text = stringResource(DsRes.string.state_error_title),
            style = discoveryBody(DiscoveryDesign.TEXT_16, FontWeight.Bold),
            textAlign = TextAlign.Center,
        )
        Spacer(Modifier.height(SalonsDesign.ERROR_TITLE_BOTTOM))
        DiscoveryGradientButton(
            text = stringResource(Res.string.filter_retry),
            onClick = onRetry,
            height = SalonsDesign.ERROR_BUTTON_HEIGHT,
            paddingHorizontal = SalonsDesign.ERROR_BUTTON_PADDING_H,
        )
    }
}

/** Hairline on top, 12 / 20 / 30 padding, 54 dp gradient Apply button (the design-system primary button). */
@Composable
private fun SheetFooter(onApply: () -> Unit) {
    val colors = AppTheme.colors
    Column(Modifier.fillMaxWidth().windowInsetsPadding(WindowInsets.navigationBars)) {
        Box(Modifier.fillMaxWidth().height(AppTheme.sizes.hairline).background(colors.line))
        AppPrimaryButton(
            text = stringResource(Res.string.filter_apply),
            onClick = onApply,
            modifier = Modifier
                .fillMaxWidth()
                .padding(
                    start = AppTheme.spacing.space20,
                    end = AppTheme.spacing.space20,
                    top = AppTheme.spacing.space12,
                    bottom = SalonsDesign.FOOTER_PADDING_BOTTOM,
                ),
        )
    }
}
