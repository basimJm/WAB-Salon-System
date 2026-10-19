package com.fab.wab.customer.feature.booking.presentation.screen

import androidx.compose.foundation.clickable
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
import androidx.compose.ui.semantics.Role
import com.fab.wab.customer.designsystem.components.avatar.AppAvatar
import com.fab.wab.customer.designsystem.components.card.AppCard
import com.fab.wab.customer.designsystem.components.control.AppRadioButton
import com.fab.wab.customer.designsystem.components.text.AppText
import com.fab.wab.customer.designsystem.theme.AppTheme
import com.fab.wab.customer.feature.booking.domain.model.StaffChoice
import com.fab.wab.customer.feature.booking.presentation.controller.contract.BookingFlowContract.UiAction
import com.fab.wab.customer.feature.booking.presentation.controller.contract.BookingFlowContract.UiState
import com.fab.wab.customer.feature.booking.presentation.resources.Res
import com.fab.wab.customer.feature.booking.presentation.resources.booking_staff_any
import com.fab.wab.customer.feature.booking.presentation.resources.booking_staff_overlap
import com.fab.wab.customer.feature.booking.presentation.resources.booking_staff_title
import com.fab.wab.customer.feature.booking.presentation.resources.booking_staff_unavailable
import org.jetbrains.compose.resources.stringResource

/** Step 3 (PRD S16): all staff listed; only the slot's eligible ones selectable; "Any available staff" on top. */
@Composable
internal fun StaffStep(state: UiState, onAction: (UiAction) -> Unit) {
    val spacing = AppTheme.spacing
    val eligible = state.eligibleStaffIds
    Column(
        modifier = Modifier.fillMaxSize().verticalScroll(rememberScrollState()).padding(spacing.space16),
        verticalArrangement = Arrangement.spacedBy(spacing.space8),
    ) {
        AppText(text = stringResource(Res.string.booking_staff_title), style = AppTheme.typography.headlineSmall)
        if (state.staffOverlapError) AppText(text = stringResource(Res.string.booking_staff_overlap), color = AppTheme.colors.danger)
        StaffRow(
            name = stringResource(Res.string.booking_staff_any),
            imageUrl = null,
            selected = state.person.staff is StaffChoice.Any,
            enabled = true,
            hint = null,
            onSelect = { onAction(UiAction.OnAnyStaffSelect) },
        )
        state.salon?.staff.orEmpty().forEach { member ->
            val isEligible = member.id in eligible
            StaffRow(
                name = member.firstName,
                imageUrl = member.photoUrl,
                selected = (state.person.staff as? StaffChoice.Specific)?.staffId == member.id,
                enabled = isEligible,
                hint = if (isEligible) null else stringResource(Res.string.booking_staff_unavailable),
                onSelect = { onAction(UiAction.OnStaffSelect(member.id)) },
            )
        }
    }
}

@Composable
private fun StaffRow(name: String, imageUrl: String?, selected: Boolean, enabled: Boolean, hint: String?, onSelect: () -> Unit) {
    val spacing = AppTheme.spacing
    AppCard(
        modifier = Modifier.fillMaxWidth().clickable(enabled = enabled, role = Role.RadioButton, onClick = onSelect),
        contentPadding = spacing.space12,
    ) {
        Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(spacing.space12)) {
            AppRadioButton(selected = selected, onClick = onSelect, enabled = enabled)
            AppAvatar(name = name, imageUrl = imageUrl, size = AppTheme.sizes.avatarSmall)
            Column(modifier = Modifier.weight(1f)) {
                AppText(text = name, color = if (enabled) AppTheme.colors.ink else AppTheme.colors.faint)
                hint?.let { AppText(text = it, style = AppTheme.typography.bodySmall, color = AppTheme.colors.faint) }
            }
        }
    }
}

