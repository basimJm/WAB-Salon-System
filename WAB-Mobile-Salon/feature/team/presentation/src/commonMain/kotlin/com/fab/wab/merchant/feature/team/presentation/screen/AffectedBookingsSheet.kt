package com.fab.wab.merchant.feature.team.presentation.screen

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier
import com.fab.wab.merchant.designsystem.components.button.AppButton
import com.fab.wab.merchant.designsystem.components.button.ButtonKind
import com.fab.wab.merchant.designsystem.components.dialog.AppBottomSheet
import com.fab.wab.merchant.designsystem.components.text.AppText
import com.fab.wab.merchant.designsystem.theme.AppTheme
import com.fab.wab.merchant.feature.team.presentation.resources.Res
import com.fab.wab.merchant.feature.team.presentation.resources.team_conflict_back
import com.fab.wab.merchant.feature.team.presentation.resources.team_conflict_cancel
import com.fab.wab.merchant.feature.team.presentation.resources.team_conflict_reassign
import com.fab.wab.merchant.feature.team.presentation.resources.team_conflict_refund
import com.fab.wab.merchant.feature.team.presentation.resources.team_conflict_title
import org.jetbrains.compose.resources.stringResource

/** PRD M17 conflict handling: Reassign (opens the booking), Cancel affected bookings (full refunds) or Go back. */
@Composable
internal fun AffectedBookingsSheet(body: String, onReassign: () -> Unit, onCancelBookings: () -> Unit, onBack: () -> Unit) {
    val spacing = AppTheme.spacing
    AppBottomSheet(onDismiss = onBack) {
        Column(modifier = Modifier.fillMaxWidth().padding(spacing.space16), verticalArrangement = Arrangement.spacedBy(spacing.space10)) {
            AppText(text = stringResource(Res.string.team_conflict_title), style = AppTheme.typography.titleMedium)
            AppText(text = body, style = AppTheme.typography.bodyMedium)
            AppText(text = stringResource(Res.string.team_conflict_refund), style = AppTheme.typography.bodySmall, color = AppTheme.colors.muted)
            AppButton(stringResource(Res.string.team_conflict_reassign), onReassign, Modifier.fillMaxWidth(), kind = ButtonKind.Outlined)
            AppButton(stringResource(Res.string.team_conflict_cancel), onCancelBookings, Modifier.fillMaxWidth(), kind = ButtonKind.Destructive)
            AppButton(stringResource(Res.string.team_conflict_back), onBack, Modifier.fillMaxWidth(), kind = ButtonKind.Text)
        }
    }
}
