package com.fab.wab.merchant.feature.bookings.presentation.screen

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.width
import androidx.compose.runtime.Composable
import androidx.compose.runtime.remember
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.semantics.Role
import com.fab.wab.merchant.core.common.TimeFormat
import com.fab.wab.merchant.designsystem.components.button.AppButton
import com.fab.wab.merchant.designsystem.components.button.ButtonKind
import com.fab.wab.merchant.designsystem.components.control.AppCheckbox
import com.fab.wab.merchant.designsystem.components.format.jodText
import com.fab.wab.merchant.designsystem.components.format.jodTextOfFils
import com.fab.wab.merchant.designsystem.components.surface.appClickable
import com.fab.wab.merchant.designsystem.components.text.AppText
import com.fab.wab.merchant.designsystem.components.textfield.AppDatePickerDialog
import com.fab.wab.merchant.designsystem.components.textfield.AppDropdownField
import com.fab.wab.merchant.designsystem.components.upload.AppImageUploader
import com.fab.wab.merchant.designsystem.components.upload.CropAspect
import com.fab.wab.merchant.designsystem.icons.AppIcons
import com.fab.wab.merchant.designsystem.resources.time_am
import com.fab.wab.merchant.designsystem.resources.time_pm
import com.fab.wab.merchant.designsystem.theme.AppTheme
import com.fab.wab.merchant.feature.bookings.domain.model.NewBookingRules
import com.fab.wab.merchant.feature.bookings.domain.model.SalonServiceOption
import com.fab.wab.merchant.feature.bookings.presentation.controller.contract.NewBookingContract.UiAction
import com.fab.wab.merchant.feature.bookings.presentation.controller.contract.NewBookingContract.UiState
import com.fab.wab.merchant.feature.bookings.presentation.controller.contract.NewBookingField
import com.fab.wab.merchant.feature.bookings.presentation.resources.Res
import com.fab.wab.merchant.feature.bookings.presentation.resources.nb_booking
import com.fab.wab.merchant.feature.bookings.presentation.resources.nb_date
import com.fab.wab.merchant.feature.bookings.presentation.resources.nb_design
import com.fab.wab.merchant.feature.bookings.presentation.resources.nb_design_remove
import com.fab.wab.merchant.feature.bookings.presentation.resources.nb_service_line
import com.fab.wab.merchant.feature.bookings.presentation.resources.nb_services
import com.fab.wab.merchant.feature.bookings.presentation.resources.nb_services_empty
import com.fab.wab.merchant.feature.bookings.presentation.resources.nb_services_error
import com.fab.wab.merchant.feature.bookings.presentation.resources.nb_staff
import com.fab.wab.merchant.feature.bookings.presentation.resources.nb_staff_any
import com.fab.wab.merchant.feature.bookings.presentation.resources.nb_time
import com.fab.wab.merchant.feature.bookings.presentation.resources.nb_time_choose
import com.fab.wab.merchant.feature.bookings.presentation.resources.nb_time_error
import com.fab.wab.merchant.feature.bookings.presentation.resources.nb_total
import kotlinx.datetime.LocalDate
import org.jetbrains.compose.resources.stringResource
import com.fab.wab.merchant.designsystem.resources.Res as DesignRes

/** Services, staff, date + start time and (tattoo) the design image of the one person booked. */
@Composable
internal fun BookingSection(state: UiState, onAction: (UiAction) -> Unit) {
    val errors = state.visibleErrors
    SectionCard(stringResource(Res.string.nb_booking)) {
        AppText(text = stringResource(Res.string.nb_services), style = AppTheme.typography.labelLarge)
        if (state.services.isEmpty()) {
            AppText(text = stringResource(Res.string.nb_services_empty), style = AppTheme.typography.bodySmall, color = AppTheme.colors.muted)
        }
        state.services.forEach { service ->
            ServiceRow(service, selected = service.id in state.selectedServiceIds) { onAction(UiAction.OnServiceToggle(service.id)) }
        }
        if (state.selectedServiceIds.isNotEmpty()) {
            AppText(
                text = stringResource(Res.string.nb_total, jodTextOfFils(state.totalFils), state.totalMinutes),
                style = AppTheme.typography.titleSmall,
            )
        }
        if (NewBookingField.SERVICES in errors) ErrorLine(stringResource(Res.string.nb_services_error))
        StaffField(state, onAction)
        DateTimeFields(state, onAction)
        if (NewBookingField.TIME in errors) ErrorLine(stringResource(Res.string.nb_time_error))
        if (state.isTattoo) DesignField(state, onAction)
    }
}

@Composable
private fun ServiceRow(service: SalonServiceOption, selected: Boolean, onToggle: () -> Unit) {
    Row(
        modifier = Modifier.fillMaxWidth().appClickable(role = Role.Checkbox, onClick = onToggle),
        horizontalArrangement = Arrangement.spacedBy(AppTheme.spacing.space8),
        verticalAlignment = Alignment.CenterVertically,
    ) {
        AppCheckbox(checked = selected, onCheckedChange = { onToggle() })
        Column(modifier = Modifier.weight(1f)) {
            AppText(text = service.name, style = AppTheme.typography.bodyMedium)
            AppText(
                text = stringResource(Res.string.nb_service_line, jodText(service.price), service.durationMinutes),
                style = AppTheme.typography.bodySmall,
                color = AppTheme.colors.muted,
            )
        }
    }
}

@Composable
private fun StaffField(state: UiState, onAction: (UiAction) -> Unit) {
    val any = stringResource(Res.string.nb_staff_any)
    val options = listOf(any) + state.staff.map { it.name }
    val selected = state.staffId?.let { id -> state.staff.indexOfFirst { it.id == id }.takeIf { it >= 0 }?.plus(1) } ?: 0
    AppDropdownField(
        options = options,
        selectedIndex = selected,
        onSelect = { index -> onAction(UiAction.OnStaff(state.staff.getOrNull(index - 1)?.id)) },
        placeholder = any,
        label = stringResource(Res.string.nb_staff),
    )
}

@Composable
private fun DateTimeFields(state: UiState, onAction: (UiAction) -> Unit) {
    val am = stringResource(DesignRes.string.time_am)
    val pm = stringResource(DesignRes.string.time_pm)
    val slots = state.slotMinutes
    val labels = remember(slots, am, pm) { slots.map { TimeFormat.to12Hour(NewBookingRules.hhmm(it), am, pm).orEmpty() } }
    AppText(text = stringResource(Res.string.nb_date), style = AppTheme.typography.labelLarge)
    AppButton(
        text = state.date?.let { TimeFormat.isoDateText(it.toString()) }.orEmpty(),
        onClick = { onAction(UiAction.OnDateClick) },
        modifier = Modifier.fillMaxWidth(),
        kind = ButtonKind.Outlined,
        leadingIcon = AppIcons.Calendar,
    )
    AppDropdownField(
        options = labels,
        selectedIndex = state.minuteOfDay?.let { slots.indexOf(it) }?.takeIf { it >= 0 },
        onSelect = { index -> slots.getOrNull(index)?.let { onAction(UiAction.OnTimeSelect(it)) } },
        placeholder = stringResource(Res.string.nb_time_choose),
        label = stringResource(Res.string.nb_time),
    )
}

@Composable
private fun DesignField(state: UiState, onAction: (UiAction) -> Unit) {
    AppText(text = stringResource(Res.string.nb_design), style = AppTheme.typography.labelLarge)
    AppImageUploader(
        item = state.design,
        aspect = CropAspect.SQUARE,
        onPick = { onAction(UiAction.OnPickDesign) },
        onRetry = { onAction(UiAction.OnPickDesign) },
        modifier = Modifier.width(AppTheme.sizes.avatarLarge),
    )
    if (state.design?.isRemovable == true) {
        AppButton(stringResource(Res.string.nb_design_remove), { onAction(UiAction.OnRemoveDesign) }, kind = ButtonKind.Text)
    }
}

@Composable
private fun ErrorLine(text: String) {
    AppText(text = text, style = AppTheme.typography.bodySmall, color = AppTheme.colors.danger)
}

/** The date dialog: today .. today + 90 days (a day outside is ignored by the view model). */
@Composable
internal fun NewBookingDateDialog(state: UiState, onAction: (UiAction) -> Unit) {
    if (!state.datePickerOpen) return
    val initial = (state.date ?: state.today)?.toString().orEmpty()
    AppDatePickerDialog(
        initialIsoDate = initial,
        onConfirm = { iso -> runCatching { LocalDate.parse(iso) }.getOrNull()?.let { onAction(UiAction.OnDateSelect(it)) } },
        onDismiss = { onAction(UiAction.OnDateDismiss) },
    )
}
