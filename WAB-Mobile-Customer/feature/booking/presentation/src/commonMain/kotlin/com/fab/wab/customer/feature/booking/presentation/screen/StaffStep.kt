package com.fab.wab.customer.feature.booking.presentation.screen

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.verticalScroll
import androidx.compose.material3.Icon
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import com.fab.wab.customer.core.domain.salon.StaffPreview
import com.fab.wab.customer.core.domain.salon.StaffStatus
import com.fab.wab.customer.designsystem.components.avatar.AppAvatar
import com.fab.wab.customer.designsystem.components.text.AppText
import com.fab.wab.customer.designsystem.icons.AppIcons
import com.fab.wab.customer.designsystem.theme.AppTheme
import com.fab.wab.customer.feature.booking.domain.model.StaffChoice
import com.fab.wab.customer.feature.booking.presentation.controller.contract.BookingFlowContract.UiAction
import com.fab.wab.customer.feature.booking.presentation.controller.contract.BookingFlowContract.UiState
import com.fab.wab.customer.feature.booking.presentation.resources.Res
import com.fab.wab.customer.feature.booking.presentation.resources.booking_staff_any
import com.fab.wab.customer.feature.booking.presentation.resources.booking_staff_any_hint
import com.fab.wab.customer.feature.booking.presentation.resources.booking_staff_available
import com.fab.wab.customer.feature.booking.presentation.resources.booking_staff_on_leave
import com.fab.wab.customer.feature.booking.presentation.resources.booking_staff_overlap
import com.fab.wab.customer.feature.booking.presentation.resources.booking_staff_title
import com.fab.wab.customer.feature.booking.presentation.resources.booking_staff_title_bride
import com.fab.wab.customer.feature.booking.presentation.resources.booking_staff_unavailable
import org.jetbrains.compose.resources.stringResource

/**
 * Step 3 (`st.s3`): title (`chooseStaff` / `chooseStaffBride`) `mb 6`, slot summary `12.5px muted mb 14`
 * ("29 September · 10:00 AM · 30 min"), "Any available staff" card, then one `card(sel, dis)` per staff member
 * (`gap:10px`): 48 dp avatar, name `14.5px 700`, status line `12px 500` (success / danger) and the 20 dp radio.
 */
@Composable
internal fun StaffStep(state: UiState, onAction: (UiAction) -> Unit) {
    val spacing = AppTheme.spacing
    val eligible = state.eligibleStaffIds
    val duration = state.availability?.durationMinutes ?: state.totals.durationMinutes
    Column(
        modifier = Modifier
            .fillMaxSize()
            .verticalScroll(rememberScrollState())
            .padding(start = spacing.space20, top = spacing.space4, end = spacing.space20, bottom = spacing.space20),
        verticalArrangement = Arrangement.spacedBy(BookingDesignConstants.shimmerGap),
    ) {
        Column {
            StepTitle(
                text = stringResource(if (state.person.isBride) Res.string.booking_staff_title_bride else Res.string.booking_staff_title),
                modifier = Modifier.padding(bottom = spacing.space6),
            )
            AppText(
                text = joinDots(whenText(state.person.date, state.person.start), durationText(duration)),
                modifier = Modifier.padding(bottom = spacing.space4),
                style = AppTheme.typography.bodySmall,
                color = AppTheme.colors.muted,
            )
        }
        if (state.staffOverlapError) {
            AppText(
                text = stringResource(Res.string.booking_staff_overlap),
                style = AppTheme.typography.bodySmall,
                color = AppTheme.colors.danger,
            )
        }
        if (state.slotsLoading) {
            ShimmerRows(BookingDesignConstants.staffShimmerHeight)
        } else {
            AnyStaffCard(selected = state.person.staff is StaffChoice.Any, onSelect = { onAction(UiAction.OnAnyStaffSelect) })
            state.salon?.staff.orEmpty().forEach { member ->
                StaffCard(
                    member = member,
                    selected = (state.person.staff as? StaffChoice.Specific)?.staffId == member.id,
                    eligible = member.id in eligible,
                    onSelect = { onAction(UiAction.OnStaffSelect(member.id)) },
                )
            }
        }
    }
}

/** Design `pickAny`: 48 dp soft circle with an accent group icon, `anyStaff` `14.5px 700`, `anyHint` `12px muted`. */
@Composable
private fun AnyStaffCard(selected: Boolean, onSelect: () -> Unit, modifier: Modifier = Modifier) {
    val colors = AppTheme.colors
    SelectionCard(selected = selected, onClick = onSelect, modifier = modifier) {
        Box(
            modifier = Modifier.size(BookingDesignConstants.staffAvatar).background(colors.soft, AppTheme.shapes.circle),
            contentAlignment = Alignment.Center,
        ) {
            Icon(AppIcons.Profile, contentDescription = null, tint = colors.accent, modifier = Modifier.size(AppTheme.sizes.icon))
        }
        Column(modifier = Modifier.weight(1f)) {
            AppText(text = stringResource(Res.string.booking_staff_any), style = AppTheme.typography.titleSmall)
            AppText(text = stringResource(Res.string.booking_staff_any_hint), style = AppTheme.typography.bodySmall, color = colors.muted)
        }
        DesignRadio(selected)
    }
}

@Composable
private fun StaffCard(member: StaffPreview, selected: Boolean, eligible: Boolean, onSelect: () -> Unit, modifier: Modifier = Modifier) {
    val colors = AppTheme.colors
    val onLeave = member.status == StaffStatus.ON_LEAVE
    val statusRes = when {
        onLeave -> Res.string.booking_staff_on_leave
        eligible -> Res.string.booking_staff_available
        else -> Res.string.booking_staff_unavailable
    }
    SelectionCard(selected = selected, onClick = onSelect, modifier = modifier, enabled = eligible) {
        AppAvatar(name = member.firstName, imageUrl = member.photoUrl, size = BookingDesignConstants.staffAvatar)
        Column(modifier = Modifier.weight(1f), verticalArrangement = Arrangement.spacedBy(AppTheme.spacing.space2)) {
            AppText(text = member.firstName, style = AppTheme.typography.titleSmall, maxLines = 1)
            AppText(
                text = stringResource(statusRes),
                style = AppTheme.typography.labelMedium,
                color = if (eligible) colors.success else colors.danger,
            )
        }
        DesignRadio(selected)
    }
}
