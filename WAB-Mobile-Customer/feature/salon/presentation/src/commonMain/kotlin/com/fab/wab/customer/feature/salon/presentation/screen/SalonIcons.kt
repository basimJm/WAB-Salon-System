package com.fab.wab.customer.feature.salon.presentation.screen

import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.outlined.StarOutline
import androidx.compose.material.icons.rounded.EventBusy
import androidx.compose.material.icons.rounded.Schedule
import androidx.compose.material.icons.rounded.WarningAmber
import androidx.compose.ui.graphics.vector.ImageVector

/** Icons of the salon design file that `AppIcons` does not carry yet (clock, calendar-closure, warning, empty star). */
internal object SalonIcons {
    val Clock: ImageVector = Icons.Rounded.Schedule
    val Closure: ImageVector = Icons.Rounded.EventBusy
    val Warning: ImageVector = Icons.Rounded.WarningAmber
    val StarEmpty: ImageVector = Icons.Outlined.StarOutline
}
