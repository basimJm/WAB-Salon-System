package com.fab.wab.merchant.feature.bookings.presentation.screen

import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.ui.Modifier
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import com.fab.wab.merchant.core.analytics.compose.TrackScreen
import com.fab.wab.merchant.core.mvi.CollectSideEffect
import com.fab.wab.merchant.core.notification.composable.rememberNotificationManager
import com.fab.wab.merchant.core.notification.model.NotificationStyle
import com.fab.wab.merchant.designsystem.components.booking.AppBookingRequestSheetContent
import com.fab.wab.merchant.designsystem.components.booking.BookingRequestUi
import com.fab.wab.merchant.designsystem.components.booking.RequestPersonUi
import com.fab.wab.merchant.designsystem.components.booking.RequestQueue
import com.fab.wab.merchant.designsystem.components.booking.RequestSheetAction
import com.fab.wab.merchant.designsystem.components.booking.RequestSheetUi
import com.fab.wab.merchant.designsystem.components.dialog.AppBottomSheet
import com.fab.wab.merchant.designsystem.components.format.dateTimeText
import com.fab.wab.merchant.designsystem.components.format.jodText
import com.fab.wab.merchant.designsystem.theme.AppTheme
import com.fab.wab.merchant.feature.bookings.domain.model.BookingDetails
import com.fab.wab.merchant.feature.bookings.presentation.analytics.BookingsAnalytics
import com.fab.wab.merchant.feature.bookings.presentation.controller.contract.BookingRequestsContract.SideEffect
import com.fab.wab.merchant.feature.bookings.presentation.controller.contract.BookingRequestsContract.UiAction
import com.fab.wab.merchant.feature.bookings.presentation.controller.contract.BookingRequestsContract.UiState
import com.fab.wab.merchant.feature.bookings.presentation.controller.vm.BookingRequestsViewModel
import com.fab.wab.merchant.feature.bookings.presentation.navigation.text
import com.fab.wab.merchant.feature.bookings.presentation.resources.Res
import com.fab.wab.merchant.feature.bookings.presentation.resources.request_time_range
import org.jetbrains.compose.resources.getString
import org.jetbrains.compose.resources.stringResource
import org.koin.compose.viewmodel.koinViewModel
import kotlin.time.Duration
import kotlin.time.Duration.Companion.milliseconds

/**
 * PRD M10 in-app: the queued booking request sheet over any screen. The shell places it once for members with
 * `BOOKINGS_RESPOND`; [onOpenDetails] routes to M09.
 */
@Composable
fun BookingRequestHost(onOpenDetails: (String) -> Unit) {
    val viewModel: BookingRequestsViewModel = koinViewModel()
    val state by viewModel.state.collectAsStateWithLifecycle()
    val notifications = rememberNotificationManager()
    CollectSideEffect(viewModel.sideEffect) { effect ->
        when (effect) {
            is SideEffect.OpenDetails -> onOpenDetails(effect.id)
            is SideEffect.ShowMessage -> notifications.show(getString(effect.message.text()), style = NotificationStyle.Success)
            is SideEffect.ShowError -> notifications.show(effect.message, style = NotificationStyle.Error)
        }
    }
    BookingRequestSheet(state, viewModel::onEvent)
}

@Composable
internal fun BookingRequestSheet(state: UiState, onAction: (UiAction) -> Unit) {
    val sheet = state.toSheet() ?: return
    TrackScreen(BookingsAnalytics.SCREEN_REQUEST)
    AppBottomSheet(onDismiss = { onAction(if (state.acceptedReference != null) UiAction.OnDone else UiAction.OnDismiss) }) {
        AppBookingRequestSheetContent(
            state = sheet,
            onAction = { onAction(it.toUiAction()) },
            modifier = Modifier.fillMaxWidth().padding(AppTheme.spacing.space16),
        )
    }
    val reject = state.reject
    if (reject != null) {
        ReasonSheet(
            dialog = reject,
            acting = state.rejecting,
            onSelect = { onAction(UiAction.OnReasonSelect(it)) },
            onText = { onAction(UiAction.OnReasonText(it)) },
            onConfirm = { onAction(UiAction.OnRejectConfirm) },
            onDismiss = { onAction(UiAction.OnRejectDismiss) },
        )
    }
}

@Composable
internal fun UiState.toSheet(): RequestSheetUi? {
    val accepted = acceptedReference
    if (accepted != null) return RequestSheetUi.Accepted(reference = accepted, hasNext = queue.isNotEmpty())
    val details = current ?: return null
    return RequestSheetUi.Request(
        request = details.toRequest(nowMs),
        queue = RequestQueue.of(0, queue.size),
        accepting = accepting,
        handledBy = handledBy,
    )
}

@Composable
private fun BookingDetails.toRequest(nowMs: Long): BookingRequestUi {
    val start = dateTimeText(summary.start)
    val created = createdAt?.toEpochMilliseconds()
    return BookingRequestUi(
        id = summary.id,
        reference = summary.reference,
        customerName = summary.customerName,
        branch = summary.branch?.name,
        persons = persons.map { person ->
            val from = person.start?.let { dateTimeText(it).time }.orEmpty()
            val to = person.end?.let { dateTimeText(it).time }.orEmpty()
            RequestPersonUi(
                name = person.name,
                services = person.services.joinToString(STAFF_SEPARATOR) { it.name },
                staff = person.staff?.name.orEmpty(),
                whenText = stringResource(Res.string.request_time_range, from, to),
                isBride = person.isBride,
            )
        },
        date = start.date,
        time = start.time,
        total = jodText(money.total),
        payment = summary.paymentStatus,
        age = if (created != null && nowMs > created) (nowMs - created).milliseconds else Duration.ZERO,
    )
}

internal fun RequestSheetAction.toUiAction(): UiAction = when (this) {
    RequestSheetAction.Accept -> UiAction.OnAccept
    RequestSheetAction.Reject -> UiAction.OnReject
    RequestSheetAction.ViewDetails -> UiAction.OnViewDetails
    RequestSheetAction.Next -> UiAction.OnNext
    RequestSheetAction.ViewBooking -> UiAction.OnViewBooking
    RequestSheetAction.Done -> UiAction.OnDone
}
