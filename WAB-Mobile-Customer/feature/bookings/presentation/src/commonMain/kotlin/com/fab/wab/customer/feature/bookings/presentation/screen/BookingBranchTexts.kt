package com.fab.wab.customer.feature.bookings.presentation.screen

import androidx.compose.foundation.layout.Column
import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier
import com.fab.wab.customer.core.domain.salon.BranchRef
import com.fab.wab.customer.designsystem.components.text.AppText
import com.fab.wab.customer.designsystem.theme.AppTheme
import com.fab.wab.customer.feature.bookings.presentation.resources.Res
import com.fab.wab.customer.feature.bookings.presentation.resources.bookings_branch_label
import org.jetbrains.compose.resources.stringResource

/**
 * Booked branch line of the bookings list card, booking details and the rating salon step (BUSINESS_DOMAIN §5.18):
 * "Branch: ‹name›" then the address; nothing for bookings made before branches.
 */
@Composable
internal fun BookedBranchLines(branch: BranchRef?, modifier: Modifier = Modifier, withAddress: Boolean = true) {
    val name = branch?.name?.takeIf { it.isNotBlank() } ?: return
    val colors = AppTheme.colors
    Column(modifier) {
        AppText(
            text = stringResource(Res.string.bookings_branch_label, name),
            style = AppTheme.typography.bodySmall,
            color = colors.accent,
            maxLines = 1,
        )
        val address = branch.locationText?.takeIf { withAddress && it.isNotBlank() }
        if (address != null) AppText(text = address, style = AppTheme.typography.bodySmall, color = colors.muted)
    }
}
