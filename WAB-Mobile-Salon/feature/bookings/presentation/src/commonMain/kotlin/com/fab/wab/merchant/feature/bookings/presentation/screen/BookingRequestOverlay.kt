package com.fab.wab.merchant.feature.bookings.presentation.screen

import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.shadow
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import com.fab.wab.merchant.core.analytics.compose.TrackScreen
import com.fab.wab.merchant.core.mvi.CollectSideEffect
import com.fab.wab.merchant.designsystem.components.booking.AppBookingRequestSheetContent
import com.fab.wab.merchant.designsystem.components.booking.RequestSheetAction
import com.fab.wab.merchant.designsystem.components.button.AppIconButton
import com.fab.wab.merchant.designsystem.components.text.AppText
import com.fab.wab.merchant.designsystem.icons.AppIcons
import com.fab.wab.merchant.designsystem.theme.AppTheme
import com.fab.wab.merchant.feature.bookings.presentation.analytics.BookingsAnalytics
import com.fab.wab.merchant.feature.bookings.presentation.controller.contract.BookingRequestsContract.SideEffect
import com.fab.wab.merchant.feature.bookings.presentation.controller.contract.BookingRequestsContract.UiAction
import com.fab.wab.merchant.feature.bookings.presentation.controller.vm.BookingRequestsViewModel
import com.fab.wab.merchant.feature.bookings.presentation.resources.Res
import com.fab.wab.merchant.feature.bookings.presentation.resources.request_later
import org.jetbrains.compose.resources.stringResource

/**
 * PRD M10 Android, outside the app (MER-029): the request card drawn over other apps. Accept answers in place; Reject
 * and "View details" open the booking in the app (the reason picker needs a window of the app); the close button
 * leaves the request pending. [onClose] runs once the queue is empty.
 */
@Composable
fun BookingRequestOverlayCard(
    viewModel: BookingRequestsViewModel,
    onOpenBooking: (String) -> Unit,
    onClose: () -> Unit,
    modifier: Modifier = Modifier,
) {
    val state by viewModel.state.collectAsStateWithLifecycle()
    var error by remember { mutableStateOf<String?>(null) }
    var shown by remember { mutableStateOf(false) }
    CollectSideEffect(viewModel.sideEffect) { effect ->
        when (effect) {
            is SideEffect.OpenDetails -> onOpenBooking(effect.id)
            is SideEffect.ShowError -> error = effect.message
            is SideEffect.ShowMessage -> Unit
        }
    }
    val sheet = state.toSheet()
    LaunchedEffect(sheet == null) {
        if (sheet != null) shown = true else if (shown) onClose()
    }
    if (sheet == null) return
    TrackScreen(BookingsAnalytics.SCREEN_REQUEST_OVERLAY)
    val colors = AppTheme.colors
    val shape = AppTheme.shapes.extraLarge
    Column(
        modifier = modifier
            .shadow(AppTheme.elevation.card, shape)
            .background(colors.card, shape)
            .border(AppTheme.sizes.hairline, colors.line, shape)
            .padding(AppTheme.spacing.space16),
        verticalArrangement = Arrangement.spacedBy(AppTheme.spacing.space8),
    ) {
        Row {
            Spacer(Modifier.weight(1f))
            AppIconButton(AppIcons.Close, stringResource(Res.string.request_later), { viewModel.onEvent(UiAction.OnDismiss) })
        }
        AppBookingRequestSheetContent(
            state = sheet,
            onAction = { action ->
                val currentId = state.current?.summary?.id
                if (action == RequestSheetAction.Reject && currentId != null) {
                    onOpenBooking(currentId)
                    viewModel.onEvent(UiAction.OnDismiss)
                } else {
                    viewModel.onEvent(action.toUiAction())
                }
            },
            modifier = Modifier.fillMaxWidth(),
        )
        error?.let { AppText(text = it, style = AppTheme.typography.bodySmall, color = colors.danger) }
    }
}
