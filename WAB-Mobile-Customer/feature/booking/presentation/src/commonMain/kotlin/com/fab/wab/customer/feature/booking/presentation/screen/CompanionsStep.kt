package com.fab.wab.customer.feature.booking.presentation.screen

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.verticalScroll
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import com.fab.wab.customer.designsystem.components.badge.AppStatusBadge
import com.fab.wab.customer.designsystem.components.badge.StatusTone
import com.fab.wab.customer.designsystem.components.button.AppIconButton
import com.fab.wab.customer.designsystem.components.button.AppOutlinedButton
import com.fab.wab.customer.designsystem.components.button.AppPrimaryButton
import com.fab.wab.customer.designsystem.components.card.AppCard
import com.fab.wab.customer.designsystem.components.text.AppText
import com.fab.wab.customer.designsystem.icons.AppIcons
import com.fab.wab.customer.designsystem.theme.AppTheme
import com.fab.wab.customer.feature.booking.domain.model.BookingFlowDefaults
import com.fab.wab.customer.feature.booking.presentation.controller.contract.BookingFlowContract.UiAction
import com.fab.wab.customer.feature.booking.presentation.controller.contract.BookingFlowContract.UiState
import com.fab.wab.customer.feature.booking.presentation.resources.Res
import com.fab.wab.customer.feature.booking.presentation.resources.booking_bride_badge
import com.fab.wab.customer.feature.booking.presentation.resources.booking_companion_add
import com.fab.wab.customer.feature.booking.presentation.resources.booking_companion_limit
import com.fab.wab.customer.feature.booking.presentation.resources.booking_companion_remove
import com.fab.wab.customer.feature.booking.presentation.resources.booking_companions_counter
import com.fab.wab.customer.feature.booking.presentation.resources.booking_companions_title
import com.fab.wab.customer.feature.booking.presentation.resources.booking_just_me
import com.fab.wab.customer.feature.booking.presentation.resources.booking_main_person
import org.jetbrains.compose.resources.stringResource

/** Step 4 (PRD S16): "Just me" / "Add companion", persons list with remove, counter, limit of 5. */
@Composable
internal fun CompanionsStep(state: UiState, onAction: (UiAction) -> Unit) {
    val spacing = AppTheme.spacing
    Column(
        modifier = Modifier.fillMaxSize().verticalScroll(rememberScrollState()).padding(spacing.space16),
        verticalArrangement = Arrangement.spacedBy(spacing.space12),
    ) {
        AppText(text = stringResource(Res.string.booking_companions_title), style = AppTheme.typography.headlineSmall)
        AppText(
            text = stringResource(Res.string.booking_companions_counter, state.companionsCount, BookingFlowDefaults.MAX_COMPANIONS),
            color = AppTheme.colors.muted,
        )
        state.persons.forEachIndexed { index, person ->
            AppCard(modifier = Modifier.fillMaxWidth(), contentPadding = spacing.space12) {
                Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(spacing.space8)) {
                    AppText(text = person.name, modifier = Modifier.weight(1f), style = AppTheme.typography.titleSmall)
                    if (index == 0) AppStatusBadge(text = stringResource(Res.string.booking_main_person), tone = StatusTone.Neutral)
                    if (person.isBride) AppStatusBadge(text = stringResource(Res.string.booking_bride_badge), tone = StatusTone.Accent)
                    if (index > 0) {
                        AppIconButton(
                            icon = AppIcons.Close,
                            contentDescription = stringResource(Res.string.booking_companion_remove),
                            onClick = { onAction(UiAction.OnRemovePerson(index)) },
                        )
                    }
                }
            }
        }
        if (!state.canAddCompanion) AppText(text = stringResource(Res.string.booking_companion_limit), color = AppTheme.colors.muted)
        AppOutlinedButton(
            text = stringResource(Res.string.booking_companion_add),
            onClick = { onAction(UiAction.OnAddCompanion) },
            modifier = Modifier.fillMaxWidth(),
            enabled = state.canAddCompanion,
            leadingIcon = AppIcons.Add,
        )
        AppPrimaryButton(
            text = stringResource(Res.string.booking_just_me),
            onClick = { onAction(UiAction.OnJustMe) },
            modifier = Modifier.fillMaxWidth(),
        )
    }
}
