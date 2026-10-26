package com.fab.wab.customer.feature.booking.presentation.screen

import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.material3.Icon
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.semantics.Role
import androidx.compose.ui.text.style.TextAlign
import com.fab.wab.customer.core.domain.salon.SalonService
import com.fab.wab.customer.designsystem.components.text.AppText
import com.fab.wab.customer.designsystem.icons.AppIcons
import com.fab.wab.customer.designsystem.resources.Res as CoreRes
import com.fab.wab.customer.designsystem.resources.price_jod
import com.fab.wab.customer.designsystem.theme.AppTheme
import com.fab.wab.customer.designsystem.utils.brandBackground
import com.fab.wab.customer.designsystem.utils.brandBrush
import com.fab.wab.customer.designsystem.utils.softShadow
import com.fab.wab.customer.feature.booking.presentation.controller.contract.BookingFlowContract.UiAction
import com.fab.wab.customer.feature.booking.presentation.controller.contract.BookingFlowContract.UiState
import com.fab.wab.customer.feature.booking.presentation.resources.Res
import com.fab.wab.customer.feature.booking.presentation.resources.booking_error_server
import com.fab.wab.customer.feature.booking.presentation.resources.booking_retry
import com.fab.wab.customer.feature.booking.presentation.resources.booking_service_bride_only
import com.fab.wab.customer.feature.booking.presentation.resources.booking_services_title
import org.jetbrains.compose.resources.stringResource

/**
 * Step 1 (`st.s1`): title `mb 14`, then the service rows (`gap:10px`): `card(sel)` with a 22 dp check box, name
 * `14px 600`, duration `12px muted mt 2` and price `14px 700 accent`. Loading = five 74 dp shimmer rows.
 */
@Composable
internal fun ServicesStep(state: UiState, onAction: (UiAction) -> Unit) {
    val spacing = AppTheme.spacing
    val selected = state.person.serviceIds.toSet()
    LazyColumn(
        modifier = Modifier.fillMaxSize(),
        contentPadding = PaddingValues(start = spacing.space20, top = spacing.space4, end = spacing.space20, bottom = spacing.space20),
        verticalArrangement = Arrangement.spacedBy(BookingDesignConstants.shimmerGap),
    ) {
        item(key = TITLE_KEY, contentType = TITLE_TYPE) {
            StepTitle(text = stringResource(Res.string.booking_services_title), modifier = Modifier.padding(bottom = spacing.space4))
        }
        items(state.offeredServices, key = { it.id }, contentType = { SERVICE_TYPE }) { service ->
            ServiceRow(service, service.id in selected, onToggle = { onAction(UiAction.OnServiceToggle(service.id)) })
        }
    }
}

@Composable
private fun ServiceRow(service: SalonService, checked: Boolean, onToggle: () -> Unit, modifier: Modifier = Modifier) {
    val colors = AppTheme.colors
    SelectionCard(selected = checked, onClick = onToggle, modifier = modifier, role = Role.Checkbox) {
        CheckBox(checked)
        Column(modifier = Modifier.weight(1f), verticalArrangement = Arrangement.spacedBy(AppTheme.spacing.space2)) {
            AppText(text = service.name, style = AppTheme.typography.titleSmall)
            AppText(text = durationText(service.durationMinutes), style = AppTheme.typography.bodySmall, color = colors.muted)
            if (service.brideOnly) {
                AppText(
                    text = stringResource(Res.string.booking_service_bride_only),
                    style = AppTheme.typography.labelSmall,
                    color = colors.onDangerContainer,
                )
            }
        }
        AppText(
            text = stringResource(CoreRes.string.price_jod, service.price),
            style = AppTheme.typography.titleSmall,
            color = colors.accent,
        )
    }
}

/** Design `box`: `22px;border-radius:7px`, gradient with a 14 dp white check when selected, `1.5px solid var(--faint)` otherwise. */
@Composable
private fun CheckBox(checked: Boolean, modifier: Modifier = Modifier) {
    val colors = AppTheme.colors
    val shape = roundedShape(BookingDesignConstants.checkBoxRadius)
    val box = modifier.size(BookingDesignConstants.checkBox)
    Box(
        modifier = if (checked) box.brandBackground(brandBrush(), shape) else box.border(AppTheme.sizes.borderWidth, colors.faint, shape),
        contentAlignment = Alignment.Center,
    ) {
        if (checked) {
            Icon(
                AppIcons.Check,
                contentDescription = null,
                tint = colors.onGradient,
                modifier = Modifier.size(BookingDesignConstants.checkIcon),
            )
        }
    }
}

/**
 * Design `svcError`: centred column `padding:70px 20px`, 100 dp soft circle with a 42 dp accent icon `mb 18`,
 * title `16px 700 mb 18`, gradient retry button `height:46px;padding:0 28px;border-radius:14px`.
 */
@Composable
internal fun ServicesErrorState(onRetry: () -> Unit, modifier: Modifier = Modifier) {
    val colors = AppTheme.colors
    val spacing = AppTheme.spacing
    Column(
        modifier = modifier.fillMaxWidth().padding(horizontal = spacing.space20, vertical = BookingDesignConstants.errorTopPadding),
        horizontalAlignment = Alignment.CenterHorizontally,
    ) {
        Box(
            modifier = Modifier
                .size(BookingDesignConstants.errorCircle)
                .background(colors.soft, AppTheme.shapes.circle),
            contentAlignment = Alignment.Center,
        ) {
            Icon(
                AppIcons.Error,
                contentDescription = null,
                tint = colors.accent,
                modifier = Modifier.size(BookingDesignConstants.errorIcon),
            )
        }
        AppText(
            text = stringResource(Res.string.booking_error_server),
            modifier = Modifier.padding(top = spacing.space20, bottom = spacing.space20),
            style = AppTheme.typography.titleMedium,
            textAlign = TextAlign.Center,
        )
        Box(
            modifier = Modifier
                .height(BookingDesignConstants.errorButtonHeight)
                .softShadow(
                    AppTheme.elevation.raised,
                    colors.accent.copy(alpha = AppTheme.elevation.buttonShadowAlpha),
                    AppTheme.shapes.medium,
                )
                .brandBackground(brandBrush(), AppTheme.shapes.medium)
                .clickable(role = Role.Button, onClick = onRetry)
                .padding(horizontal = BookingDesignConstants.errorButtonPadding),
            contentAlignment = Alignment.Center,
        ) {
            AppText(text = stringResource(Res.string.booking_retry), style = AppTheme.typography.titleSmall, color = colors.onGradient)
        }
    }
}

private const val SERVICE_TYPE = "service"
private const val TITLE_TYPE = "title"
private const val TITLE_KEY = "services-title"
