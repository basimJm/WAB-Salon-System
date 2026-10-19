package com.fab.wab.customer.feature.booking.presentation.screen

import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.semantics.Role
import com.fab.wab.customer.core.domain.salon.SalonService
import com.fab.wab.customer.designsystem.components.card.AppCard
import com.fab.wab.customer.designsystem.components.control.AppCheckbox
import com.fab.wab.customer.designsystem.components.text.AppText
import com.fab.wab.customer.designsystem.resources.Res as CoreRes
import com.fab.wab.customer.designsystem.resources.price_jod
import com.fab.wab.customer.designsystem.resources.service_duration_minutes
import com.fab.wab.customer.designsystem.theme.AppTheme
import com.fab.wab.customer.feature.booking.domain.model.filsToJod
import com.fab.wab.customer.feature.booking.presentation.controller.contract.BookingFlowContract.UiAction
import com.fab.wab.customer.feature.booking.presentation.controller.contract.BookingFlowContract.UiState
import com.fab.wab.customer.feature.booking.presentation.resources.Res
import com.fab.wab.customer.feature.booking.presentation.resources.booking_total_duration
import com.fab.wab.customer.feature.booking.presentation.resources.booking_total_price
import org.jetbrains.compose.resources.stringResource

/** Step 1 (PRD S16): multi-select with price + duration per service; bride-only services need a contract flag (flagged). */
@Composable
internal fun ServicesStep(state: UiState, onAction: (UiAction) -> Unit) {
    val spacing = AppTheme.spacing
    val selected = state.person.serviceIds.toSet()
    LazyColumn(
        modifier = Modifier.fillMaxSize(),
        contentPadding = PaddingValues(spacing.space16),
        verticalArrangement = Arrangement.spacedBy(spacing.space8),
    ) {
        items(state.salon?.services.orEmpty(), key = { it.id }, contentType = { SERVICE_TYPE }) { service ->
            ServiceRow(service, service.id in selected) { onAction(UiAction.OnServiceToggle(service.id)) }
        }
    }
}

@Composable
private fun ServiceRow(service: SalonService, checked: Boolean, onToggle: () -> Unit) {
    val spacing = AppTheme.spacing
    AppCard(modifier = Modifier.fillMaxWidth().clickable(role = Role.Checkbox, onClick = onToggle), contentPadding = spacing.space12) {
        Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(spacing.space12)) {
            AppCheckbox(checked = checked, onCheckedChange = { onToggle() })
            Column(modifier = Modifier.weight(1f)) {
                AppText(text = service.name, style = AppTheme.typography.titleSmall)
                AppText(
                    text = stringResource(CoreRes.string.service_duration_minutes, service.durationMinutes),
                    color = AppTheme.colors.muted,
                )
            }
            AppText(text = stringResource(CoreRes.string.price_jod, service.price), style = AppTheme.typography.titleSmall)
        }
    }
}

/** Running totals in the sticky bar (PRD S16 step 1). */
@Composable
internal fun ServicesTotals(state: UiState) {
    Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween) {
        AppText(text = stringResource(Res.string.booking_total_duration, state.totals.durationMinutes), color = AppTheme.colors.muted)
        AppText(
            text = stringResource(Res.string.booking_total_price, filsToJod(state.totals.priceFils)),
            style = AppTheme.typography.titleSmall,
        )
    }
}

private const val SERVICE_TYPE = "service"
