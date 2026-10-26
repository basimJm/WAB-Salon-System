package com.fab.wab.customer.feature.booking.presentation.screen

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.verticalScroll
import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier
import com.fab.wab.customer.core.common.TimeFormat
import com.fab.wab.customer.core.domain.salon.SalonBranch
import com.fab.wab.customer.designsystem.components.domain.hoursLine
import com.fab.wab.customer.designsystem.components.text.AppText
import com.fab.wab.customer.designsystem.resources.Res as CoreRes
import com.fab.wab.customer.designsystem.resources.salon_closed_now
import com.fab.wab.customer.designsystem.resources.salon_closed_today
import com.fab.wab.customer.designsystem.resources.salon_hours_separator
import com.fab.wab.customer.designsystem.resources.salon_open
import com.fab.wab.customer.designsystem.resources.time_am
import com.fab.wab.customer.designsystem.resources.time_pm
import com.fab.wab.customer.designsystem.resources.time_range_separator
import com.fab.wab.customer.designsystem.theme.AppTheme
import com.fab.wab.customer.feature.booking.presentation.controller.contract.BookingFlowContract.UiAction
import com.fab.wab.customer.feature.booking.presentation.controller.contract.BookingFlowContract.UiState
import com.fab.wab.customer.feature.booking.presentation.resources.Res
import com.fab.wab.customer.feature.booking.presentation.resources.booking_branch_hint
import com.fab.wab.customer.feature.booking.presentation.resources.booking_branch_title
import com.fab.wab.customer.feature.booking.presentation.resources.booking_summary_branch
import org.jetbrains.compose.resources.stringResource

/**
 * Step 0 (BUSINESS_DOMAIN §5.18, only when the salon has several bookable branches): title + hint, then one selection
 * card per branch (main first) with its name, address and today's open / closed line; Continue needs a branch.
 */
@Composable
internal fun BranchStep(state: UiState, onAction: (UiAction) -> Unit) {
    val spacing = AppTheme.spacing
    Column(
        modifier = Modifier
            .fillMaxSize()
            .verticalScroll(rememberScrollState())
            .padding(start = spacing.space20, top = spacing.space4, end = spacing.space20, bottom = spacing.space20),
        verticalArrangement = Arrangement.spacedBy(BookingDesignConstants.shimmerGap),
    ) {
        Column {
            StepTitle(text = stringResource(Res.string.booking_branch_title), modifier = Modifier.padding(bottom = spacing.space6))
            AppText(
                text = stringResource(Res.string.booking_branch_hint),
                style = AppTheme.typography.bodySmall,
                color = AppTheme.colors.muted,
            )
        }
        state.fullSalon?.branches.orEmpty().forEach { branch ->
            BranchCard(branch, selected = branch.id == state.branchId, onSelect = { onAction(UiAction.OnBranchSelect(branch.id)) })
        }
    }
}

@Composable
private fun BranchCard(branch: SalonBranch, selected: Boolean, onSelect: () -> Unit, modifier: Modifier = Modifier) {
    val colors = AppTheme.colors
    SelectionCard(selected = selected, onClick = onSelect, modifier = modifier) {
        Column(modifier = Modifier.weight(1f), verticalArrangement = Arrangement.spacedBy(AppTheme.spacing.space2)) {
            AppText(text = branch.name, style = AppTheme.typography.titleSmall, maxLines = 1)
            branch.locationText?.let { AppText(text = it, style = AppTheme.typography.bodySmall, color = colors.muted) }
            AppText(
                text = branchStatusText(branch),
                style = AppTheme.typography.labelMedium,
                color = if (branch.isOpenNow) colors.success else colors.danger,
            )
        }
        DesignRadio(selected)
    }
}

/** "Open · 10:00 AM – 10:00 PM" or the closed label, as on the salon cards. */
@Composable
private fun branchStatusText(branch: SalonBranch): String = hoursLine(
    isOpen = branch.isOpenNow,
    todayHours = branch.todayHours?.let {
        TimeFormat.range12Hour(
            open = it.open,
            close = it.close,
            am = stringResource(CoreRes.string.time_am),
            pm = stringResource(CoreRes.string.time_pm),
            rangeSeparator = stringResource(CoreRes.string.time_range_separator),
        )
    },
    openLabel = stringResource(CoreRes.string.salon_open),
    closedLabel = stringResource(CoreRes.string.salon_closed_today),
    separator = stringResource(CoreRes.string.salon_hours_separator),
    closedNowLabel = stringResource(CoreRes.string.salon_closed_now),
)

/** Summary line of the chosen branch: "Branch: Mecca Street", then its address. */
@Composable
internal fun SummaryBranch(branch: SalonBranch, modifier: Modifier = Modifier) {
    Column(modifier = modifier.fillMaxWidth(), verticalArrangement = Arrangement.spacedBy(AppTheme.spacing.space2)) {
        AppText(text = stringResource(Res.string.booking_summary_branch, branch.name), style = AppTheme.typography.titleSmall)
        branch.locationText?.let { AppText(text = it, style = AppTheme.typography.bodySmall, color = AppTheme.colors.muted) }
    }
}
