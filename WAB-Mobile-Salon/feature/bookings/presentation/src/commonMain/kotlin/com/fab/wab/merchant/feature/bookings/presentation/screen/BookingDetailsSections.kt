package com.fab.wab.merchant.feature.bookings.presentation.screen

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.font.FontWeight
import com.fab.wab.merchant.designsystem.components.avatar.AppAvatar
import com.fab.wab.merchant.designsystem.components.booking.AppBrideBadge
import com.fab.wab.merchant.designsystem.components.button.AppButton
import com.fab.wab.merchant.designsystem.components.button.ButtonKind
import com.fab.wab.merchant.designsystem.components.divider.AppDivider
import com.fab.wab.merchant.designsystem.components.format.dateTimeText
import com.fab.wab.merchant.designsystem.components.format.jodText
import com.fab.wab.merchant.designsystem.components.text.AppText
import com.fab.wab.merchant.designsystem.theme.AppTheme
import com.fab.wab.merchant.feature.bookings.domain.model.BookingAction
import com.fab.wab.merchant.feature.bookings.domain.model.BookingDetails
import com.fab.wab.merchant.feature.bookings.domain.model.BookingPerson
import com.fab.wab.merchant.feature.bookings.domain.model.StaffRef
import com.fab.wab.merchant.feature.bookings.presentation.controller.contract.BookingDetailsContract.UiAction
import com.fab.wab.merchant.feature.bookings.presentation.controller.contract.BookingDetailsContract.UiState
import com.fab.wab.merchant.feature.bookings.presentation.resources.Res
import com.fab.wab.merchant.feature.bookings.presentation.resources.action_accept
import com.fab.wab.merchant.feature.bookings.presentation.resources.action_cancel
import com.fab.wab.merchant.feature.bookings.presentation.resources.action_complete
import com.fab.wab.merchant.feature.bookings.presentation.resources.action_no_show
import com.fab.wab.merchant.feature.bookings.presentation.resources.action_reassign
import com.fab.wab.merchant.feature.bookings.presentation.resources.action_reject
import com.fab.wab.merchant.feature.bookings.presentation.resources.details_paid_at_salon
import com.fab.wab.merchant.feature.bookings.presentation.resources.details_paid_online
import com.fab.wab.merchant.feature.bookings.presentation.resources.details_payment
import com.fab.wab.merchant.feature.bookings.presentation.resources.details_persons
import com.fab.wab.merchant.feature.bookings.presentation.resources.details_refunded
import com.fab.wab.merchant.feature.bookings.presentation.resources.details_remaining
import com.fab.wab.merchant.feature.bookings.presentation.resources.details_total
import com.fab.wab.merchant.feature.bookings.presentation.resources.request_time_range
import com.fab.wab.merchant.feature.bookings.presentation.resources.service_line
import org.jetbrains.compose.resources.StringResource
import org.jetbrains.compose.resources.stringResource

/** Order of the sticky action bar: the primary answer first (design 03 `on.details`). */
private val ACTION_ORDER = listOf(
    BookingAction.APPROVE, BookingAction.COMPLETE, BookingAction.REJECT,
    BookingAction.NO_SHOW, BookingAction.REASSIGN, BookingAction.CANCEL,
)

@Composable
internal fun PersonsCard(details: BookingDetails) {
    SectionCard(stringResource(Res.string.details_persons)) {
        details.persons.forEachIndexed { index, person ->
            if (index > 0) AppDivider()
            PersonBlock(person)
        }
    }
}

@Composable
private fun PersonBlock(person: BookingPerson) {
    val spacing = AppTheme.spacing
    Column(verticalArrangement = Arrangement.spacedBy(spacing.space4), modifier = Modifier.padding(vertical = spacing.space4)) {
        Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(spacing.space6)) {
            AppText(
                text = person.name,
                style = AppTheme.typography.titleSmall.copy(fontWeight = FontWeight.Bold),
                modifier = Modifier.weight(1f),
            )
            if (person.isBride) AppBrideBadge()
            AppText(text = jodText(person.subtotal), style = AppTheme.typography.labelLarge)
        }
        person.services.forEach { service ->
            AppText(
                text = stringResource(Res.string.service_line, service.name, service.durationMinutes, jodText(service.price)),
                style = AppTheme.typography.bodySmall,
            )
        }
        val start = person.start
        val end = person.end
        val staff = person.staff
        if (staff != null && start != null && end != null) {
            PersonStaffRow(staff, stringResource(Res.string.request_time_range, dateTimeText(start).time, dateTimeText(end).time))
        }
    }
}

/** Design 03 person footer: 26 dp staff photo (letter when there is none), staff name, start – end. */
@Composable
private fun PersonStaffRow(staff: StaffRef, time: String) {
    Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(AppTheme.spacing.space8)) {
        AppAvatar(
            name = staff.name,
            imageUrl = staff.photoUrl,
            size = BookingsDesignConstants.PERSON_STAFF_AVATAR,
            initialsStyle = AppTheme.typography.labelSmall.copy(fontWeight = FontWeight.Bold),
            maxLetters = 1,
        )
        AppText(
            text = staff.name,
            style = AppTheme.typography.bodySmall.copy(fontWeight = FontWeight.SemiBold),
            modifier = Modifier.weight(1f),
        )
        AppText(text = time, style = AppTheme.typography.bodySmall, color = AppTheme.colors.muted)
    }
}

@Composable
internal fun PaymentCard(details: BookingDetails) {
    val money = details.money
    SectionCard(stringResource(Res.string.details_payment)) {
        MoneyRow(Res.string.details_total, money.total, bold = true)
        MoneyRow(Res.string.details_paid_online, money.paidOnline)
        if (money.hasPaidAtSalon) MoneyRow(Res.string.details_paid_at_salon, money.paidAtSalon)
        MoneyRow(Res.string.details_remaining, money.remaining)
        if (money.hasRefund) MoneyRow(Res.string.details_refunded, money.refunded)
    }
}

@Composable
private fun MoneyRow(label: StringResource, value: String, bold: Boolean = false) {
    val style = if (bold) AppTheme.typography.titleSmall.copy(fontWeight = FontWeight.Bold) else AppTheme.typography.bodyMedium
    Row(modifier = Modifier.fillMaxWidth(), verticalAlignment = Alignment.CenterVertically) {
        AppText(text = stringResource(label), style = style, modifier = Modifier.weight(1f))
        AppText(text = jodText(value), style = style)
    }
}

/** Sticky bar with the actions the server allows for this member (hidden, not disabled). */
@Composable
internal fun BookingActionBar(state: UiState, onAction: (UiAction) -> Unit) {
    val spacing = AppTheme.spacing
    val actions = ACTION_ORDER.filter { it in state.actions }
    Column(
        modifier = Modifier.fillMaxWidth().padding(horizontal = spacing.space16, vertical = spacing.space10),
        verticalArrangement = Arrangement.spacedBy(spacing.space8),
    ) {
        actions.chunked(ACTIONS_PER_ROW).forEach { row ->
            Row(horizontalArrangement = Arrangement.spacedBy(spacing.space10)) {
                row.forEach { action ->
                    AppButton(
                        text = stringResource(action.label()),
                        onClick = { onAction(UiAction.OnActionClick(action)) },
                        modifier = Modifier.weight(1f),
                        kind = action.kind(),
                        enabled = state.acting == null,
                        loading = state.acting == action && state.dialog == null,
                    )
                }
            }
        }
    }
}

private const val ACTIONS_PER_ROW = 2

internal fun BookingAction.label(): StringResource = when (this) {
    BookingAction.APPROVE -> Res.string.action_accept
    BookingAction.REJECT -> Res.string.action_reject
    BookingAction.CANCEL -> Res.string.action_cancel
    BookingAction.REASSIGN -> Res.string.action_reassign
    BookingAction.COMPLETE -> Res.string.action_complete
    BookingAction.NO_SHOW -> Res.string.action_no_show
}

private fun BookingAction.kind(): ButtonKind = when (this) {
    BookingAction.APPROVE, BookingAction.COMPLETE -> ButtonKind.Success
    BookingAction.REJECT, BookingAction.CANCEL -> ButtonKind.Destructive
    BookingAction.NO_SHOW, BookingAction.REASSIGN -> ButtonKind.Outlined
}
