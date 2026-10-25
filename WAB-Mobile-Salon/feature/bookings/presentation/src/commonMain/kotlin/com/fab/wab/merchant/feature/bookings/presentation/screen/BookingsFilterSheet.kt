package com.fab.wab.merchant.feature.bookings.presentation.screen

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.ExperimentalLayoutApi
import androidx.compose.foundation.layout.FlowRow
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.verticalScroll
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import com.fab.wab.merchant.core.domain.booking.BookingStatus
import com.fab.wab.merchant.core.domain.booking.PaymentStatus
import com.fab.wab.merchant.designsystem.components.booking.bookingStatusLabel
import com.fab.wab.merchant.designsystem.components.booking.paymentStatusLabel
import com.fab.wab.merchant.designsystem.components.button.AppButton
import com.fab.wab.merchant.designsystem.components.button.ButtonKind
import com.fab.wab.merchant.designsystem.components.chip.AppFilterChip
import com.fab.wab.merchant.designsystem.components.control.AppSwitch
import com.fab.wab.merchant.designsystem.components.dialog.AppBottomSheet
import com.fab.wab.merchant.designsystem.components.text.AppText
import com.fab.wab.merchant.designsystem.components.textfield.AppDatePickerDialog
import com.fab.wab.merchant.designsystem.components.textfield.DatePickerDates
import com.fab.wab.merchant.designsystem.theme.AppTheme
import com.fab.wab.merchant.feature.bookings.domain.model.BookingFilter
import com.fab.wab.merchant.feature.bookings.presentation.controller.contract.BookingsContract.UiAction
import com.fab.wab.merchant.feature.bookings.presentation.controller.contract.BookingsContract.UiState
import com.fab.wab.merchant.feature.bookings.presentation.resources.Res
import com.fab.wab.merchant.feature.bookings.presentation.resources.bookings_any_date
import com.fab.wab.merchant.feature.bookings.presentation.resources.bookings_filter
import com.fab.wab.merchant.feature.bookings.presentation.resources.bookings_filter_apply
import com.fab.wab.merchant.feature.bookings.presentation.resources.bookings_filter_bride
import com.fab.wab.merchant.feature.bookings.presentation.resources.bookings_filter_dates
import com.fab.wab.merchant.feature.bookings.presentation.resources.bookings_filter_from
import com.fab.wab.merchant.feature.bookings.presentation.resources.bookings_filter_payment
import com.fab.wab.merchant.feature.bookings.presentation.resources.bookings_filter_reset
import com.fab.wab.merchant.feature.bookings.presentation.resources.bookings_filter_staff
import com.fab.wab.merchant.feature.bookings.presentation.resources.bookings_filter_status
import com.fab.wab.merchant.feature.bookings.presentation.resources.bookings_filter_to
import kotlinx.datetime.LocalDate
import org.jetbrains.compose.resources.stringResource

private enum class DateEnd { FROM, TO }

private const val RESET_WEIGHT = 1f
private const val APPLY_WEIGHT = 2f

/** PRD M08 filter sheet (design 03 `filterOn`): a draft the user applies or resets. */
@OptIn(ExperimentalLayoutApi::class)
@Composable
internal fun BookingsFilterSheet(state: UiState, onAction: (UiAction) -> Unit) {
    var draft by remember { mutableStateOf(state.filter) }
    var picking by remember { mutableStateOf<DateEnd?>(null) }
    val spacing = AppTheme.spacing
    AppBottomSheet(onDismiss = { onAction(UiAction.OnFilterDismiss) }) {
        Column(
            modifier = Modifier.fillMaxWidth().verticalScroll(rememberScrollState()).padding(spacing.space20),
            verticalArrangement = Arrangement.spacedBy(spacing.space14),
        ) {
            AppText(text = stringResource(Res.string.bookings_filter), style = AppTheme.typography.titleMedium)
            Label(stringResource(Res.string.bookings_filter_dates))
            Row(horizontalArrangement = Arrangement.spacedBy(spacing.space10)) {
                DateButton(
                    stringResource(Res.string.bookings_filter_from),
                    draft.from,
                    onClick = { picking = DateEnd.FROM },
                    modifier = Modifier.weight(1f),
                )
                DateButton(
                    stringResource(Res.string.bookings_filter_to),
                    draft.to,
                    onClick = { picking = DateEnd.TO },
                    modifier = Modifier.weight(1f),
                )
            }
            if (state.visibleStaff.isNotEmpty()) {
                Label(stringResource(Res.string.bookings_filter_staff))
                FlowRow(
                    horizontalArrangement = Arrangement.spacedBy(spacing.space8),
                    verticalArrangement = Arrangement.spacedBy(spacing.space8),
                ) {
                    state.visibleStaff.forEach { staff ->
                        val selected = staff.id in draft.staffIds
                        AppFilterChip(text = staff.name, selected = selected, onClick = {
                            draft = draft.copy(staffIds = if (selected) draft.staffIds - staff.id else draft.staffIds + staff.id)
                        })
                    }
                }
            }
            Label(stringResource(Res.string.bookings_filter_status))
            FlowRow(
                horizontalArrangement = Arrangement.spacedBy(spacing.space8),
                verticalArrangement = Arrangement.spacedBy(spacing.space8),
            ) {
                BookingStatus.entries.forEach { status ->
                    val selected = status in draft.statuses
                    AppFilterChip(text = bookingStatusLabel(status), selected = selected, onClick = {
                        draft = draft.copy(statuses = if (selected) draft.statuses - status else draft.statuses + status)
                    })
                }
            }
            Label(stringResource(Res.string.bookings_filter_payment))
            FlowRow(
                horizontalArrangement = Arrangement.spacedBy(spacing.space8),
                verticalArrangement = Arrangement.spacedBy(spacing.space8),
            ) {
                PaymentStatus.entries.forEach { payment ->
                    val selected = draft.paymentStatus == payment
                    AppFilterChip(text = paymentStatusLabel(payment), selected = selected, onClick = {
                        draft = draft.copy(paymentStatus = if (selected) null else payment)
                    })
                }
            }
            Row(verticalAlignment = Alignment.CenterVertically) {
                AppText(
                    text = stringResource(Res.string.bookings_filter_bride),
                    style = AppTheme.typography.bodyMedium,
                    modifier = Modifier.weight(1f),
                )
                AppSwitch(checked = draft.brideOnly, onCheckedChange = { draft = draft.copy(brideOnly = it) })
            }
            Row(horizontalArrangement = Arrangement.spacedBy(spacing.space10)) {
                AppButton(
                    stringResource(Res.string.bookings_filter_reset),
                    { onAction(UiAction.OnFilterClear) },
                    Modifier.weight(RESET_WEIGHT),
                    kind = ButtonKind.Outlined,
                )
                AppButton(
                    stringResource(Res.string.bookings_filter_apply),
                    { onAction(UiAction.OnFilterApply(draft)) },
                    Modifier.weight(APPLY_WEIGHT),
                )
            }
        }
    }
    picking?.let { end ->
        val initial = (if (end == DateEnd.FROM) draft.from else draft.to)?.toString().orEmpty()
        AppDatePickerDialog(
            initialIsoDate = initial,
            onConfirm = { iso ->
                val date = runCatching { LocalDate.parse(iso) }.getOrNull()
                draft = draft.withDate(end == DateEnd.FROM, date)
                picking = null
            },
            onDismiss = { picking = null },
        )
    }
}

/** Keeps `from ≤ to`: picking an end before the start moves the other end with it. */
internal fun BookingFilter.withDate(isFrom: Boolean, date: LocalDate?): BookingFilter {
    if (date == null) return this
    return if (isFrom) {
        copy(from = date, to = to?.takeIf { it >= date } ?: to?.let { date })
    } else {
        copy(to = date, from = from?.takeIf { it <= date } ?: from?.let { date })
    }
}

@Composable
private fun Label(text: String) {
    AppText(text = text, style = AppTheme.typography.labelMedium, color = AppTheme.colors.accent)
}

@Composable
private fun DateButton(label: String, date: LocalDate?, onClick: () -> Unit, modifier: Modifier = Modifier) {
    val value = date?.let { DatePickerDates.display(it.toString()) } ?: stringResource(Res.string.bookings_any_date)
    Column(modifier = modifier) {
        AppText(text = label, style = AppTheme.typography.labelSmall, color = AppTheme.colors.muted)
        AppButton(text = value, onClick = onClick, kind = ButtonKind.Outlined, modifier = Modifier.fillMaxWidth())
    }
}
