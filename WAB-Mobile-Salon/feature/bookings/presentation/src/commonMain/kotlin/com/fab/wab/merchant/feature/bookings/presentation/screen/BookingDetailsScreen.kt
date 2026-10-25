package com.fab.wab.merchant.feature.bookings.presentation.screen

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.ExperimentalLayoutApi
import androidx.compose.foundation.layout.FlowRow
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.verticalScroll
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.font.FontWeight
import com.fab.wab.merchant.core.analytics.compose.TrackScreen
import com.fab.wab.merchant.core.domain.booking.BookingStatus
import com.fab.wab.merchant.core.domain.booking.BookingTimers
import com.fab.wab.merchant.core.domain.booking.RefundStatus
import com.fab.wab.merchant.designsystem.components.booking.AppBookingStatusBadge
import com.fab.wab.merchant.designsystem.components.booking.AppBrideBadge
import com.fab.wab.merchant.designsystem.components.booking.AppPaymentBadge
import com.fab.wab.merchant.designsystem.components.booking.AppRefundBadge
import com.fab.wab.merchant.designsystem.components.booking.AppStatusTimeline
import com.fab.wab.merchant.designsystem.components.booking.AutoCancelStrip
import com.fab.wab.merchant.designsystem.components.booking.StatusHistoryEntryUi
import com.fab.wab.merchant.designsystem.components.booking.autoCancelText
import com.fab.wab.merchant.designsystem.components.booking.bookingStatusLabel
import com.fab.wab.merchant.designsystem.components.button.AppButton
import com.fab.wab.merchant.designsystem.components.button.ButtonKind
import com.fab.wab.merchant.designsystem.components.card.AppCard
import com.fab.wab.merchant.designsystem.components.feedback.AppErrorState
import com.fab.wab.merchant.designsystem.components.feedback.AppLoadingIndicator
import com.fab.wab.merchant.designsystem.components.format.dateTimeText
import com.fab.wab.merchant.designsystem.components.layout.AppPullToRefresh
import com.fab.wab.merchant.designsystem.components.layout.AppScreen
import com.fab.wab.merchant.designsystem.components.navigation.AppTopBar
import com.fab.wab.merchant.designsystem.components.text.AppText
import com.fab.wab.merchant.designsystem.icons.AppIcons
import com.fab.wab.merchant.designsystem.theme.AppTheme
import com.fab.wab.merchant.feature.bookings.domain.model.BookingDetails
import com.fab.wab.merchant.feature.bookings.presentation.analytics.BookingsAnalytics
import com.fab.wab.merchant.feature.bookings.presentation.controller.contract.BookingDetailsContract.UiAction
import com.fab.wab.merchant.feature.bookings.presentation.controller.contract.BookingDetailsContract.UiState
import com.fab.wab.merchant.feature.bookings.presentation.resources.Res
import com.fab.wab.merchant.feature.bookings.presentation.resources.actor_system
import com.fab.wab.merchant.feature.bookings.presentation.resources.actor_admin
import com.fab.wab.merchant.feature.bookings.presentation.resources.actor_member
import com.fab.wab.merchant.feature.bookings.presentation.resources.actor_customer
import com.fab.wab.merchant.feature.bookings.presentation.resources.details_call
import com.fab.wab.merchant.feature.bookings.presentation.resources.details_cancel_reason
import com.fab.wab.merchant.feature.bookings.presentation.resources.details_copy
import com.fab.wab.merchant.feature.bookings.presentation.resources.details_customer
import com.fab.wab.merchant.feature.bookings.presentation.resources.details_history
import com.fab.wab.merchant.feature.bookings.presentation.resources.details_policy
import com.fab.wab.merchant.feature.bookings.presentation.resources.details_refund_done
import com.fab.wab.merchant.feature.bookings.presentation.resources.details_refund_failed
import com.fab.wab.merchant.feature.bookings.presentation.resources.details_refund_pending
import com.fab.wab.merchant.feature.bookings.presentation.resources.details_reject_reason
import com.fab.wab.merchant.feature.bookings.presentation.resources.details_title
import com.fab.wab.merchant.feature.bookings.presentation.resources.details_whatsapp
import com.fab.wab.merchant.feature.bookings.presentation.resources.history_line
import org.jetbrains.compose.resources.stringResource

/** PRD M09 (design 03 `on.details`). */
@Composable
fun BookingDetailsScreen(state: UiState, onAction: (UiAction) -> Unit, onBack: () -> Unit, modifier: Modifier = Modifier) {
    TrackScreen(BookingsAnalytics.SCREEN_DETAILS)
    val details = state.details
    AppScreen(
        modifier = modifier,
        topBar = { AppTopBar(title = stringResource(Res.string.details_title), onBack = onBack) },
        bottomBar = { if (details != null && state.actions.isNotEmpty()) BookingActionBar(state, onAction) },
    ) { padding ->
        when {
            state.loading && details == null -> Box(Modifier.fillMaxSize(), contentAlignment = Alignment.Center) { AppLoadingIndicator() }
            details == null -> AppErrorState(onRetry = { onAction(UiAction.OnRetry) }, message = state.error)
            else -> AppPullToRefresh(
                refreshing = state.refreshing,
                onRefresh = { onAction(UiAction.OnRefresh) },
                modifier = Modifier.padding(padding),
            ) {
                DetailsContent(details, state.nowMs, onAction)
            }
        }
    }
    BookingDetailsDialogs(state, onAction)
}

@Composable
private fun DetailsContent(details: BookingDetails, nowMs: Long, onAction: (UiAction) -> Unit) {
    val spacing = AppTheme.spacing
    Column(
        modifier = Modifier.fillMaxSize().verticalScroll(rememberScrollState()).padding(spacing.space16),
        verticalArrangement = Arrangement.spacedBy(spacing.space12),
    ) {
        Header(details, nowMs, onAction)
        CustomerCard(details, onAction)
        PersonsCard(details)
        PaymentCard(details)
        if (details.policy.isNotEmpty()) {
            SectionCard(stringResource(Res.string.details_policy)) {
                details.policy.values.forEach { AppText(text = it, style = AppTheme.typography.bodySmall, color = AppTheme.colors.muted) }
            }
        }
        if (details.history.isNotEmpty()) {
            SectionCard(stringResource(Res.string.details_history)) { AppStatusTimeline(details.history.map { it.toUi() }) }
        }
    }
}

@OptIn(ExperimentalLayoutApi::class)
@Composable
private fun Header(details: BookingDetails, nowMs: Long, onAction: (UiAction) -> Unit) {
    val summary = details.summary
    val spacing = AppTheme.spacing
    AppCard(modifier = Modifier.fillMaxWidth()) {
        Column(verticalArrangement = Arrangement.spacedBy(spacing.space8)) {
            Row(verticalAlignment = Alignment.CenterVertically) {
                AppText(
                    text = summary.reference,
                    style = AppTheme.typography.titleMedium.copy(fontWeight = FontWeight.Bold),
                    modifier = Modifier.weight(1f),
                )
                AppButton(stringResource(Res.string.details_copy), { onAction(UiAction.OnCopyReference) }, kind = ButtonKind.Text)
            }
            FlowRow(
                horizontalArrangement = Arrangement.spacedBy(spacing.space6),
                verticalArrangement = Arrangement.spacedBy(spacing.space6),
            ) {
                AppBookingStatusBadge(summary.status)
                summary.paymentStatus?.let { AppPaymentBadge(it) }
                AppRefundBadge(details.refundStatus)
                if (summary.hasBride) AppBrideBadge()
            }
            val text = dateTimeText(summary.start)
            AppText(text = stringResource(Res.string.history_line, text.date, text.time), style = AppTheme.typography.bodyMedium)
            val respondBy = summary.respondBy
            if (summary.status == BookingStatus.PENDING && respondBy != null && nowMs > 0) {
                AutoCancelStrip(autoCancelText(BookingTimers.autoCancelRemaining(respondBy.toEpochMilliseconds(), nowMs)))
            }
            refundNote(details.refundStatus)?.let {
                AppText(text = stringResource(it), style = AppTheme.typography.bodySmall, color = AppTheme.colors.muted)
            }
            details.rejectionReason?.let { ReasonLine(stringResource(Res.string.details_reject_reason), it) }
            details.cancellationReason?.let { ReasonLine(stringResource(Res.string.details_cancel_reason), it) }
        }
    }
}

@OptIn(ExperimentalLayoutApi::class)
@Composable
private fun CustomerCard(details: BookingDetails, onAction: (UiAction) -> Unit) {
    val spacing = AppTheme.spacing
    SectionCard(stringResource(Res.string.details_customer)) {
        AppText(text = details.summary.customerName, style = AppTheme.typography.titleSmall.copy(fontWeight = FontWeight.Bold))
        details.summary.customerPhone?.let { phone ->
            AppText(text = phone, style = AppTheme.typography.bodySmall, color = AppTheme.colors.muted)
            // Side by side when both labels fit, stacked otherwise (narrow phones, large font scales).
            FlowRow(
                horizontalArrangement = Arrangement.spacedBy(spacing.space10),
                verticalArrangement = Arrangement.spacedBy(spacing.space10),
                maxItemsInEachRow = CONTACT_BUTTONS,
            ) {
                AppButton(
                    stringResource(Res.string.details_call),
                    { onAction(UiAction.OnCallCustomer) },
                    kind = ButtonKind.Secondary,
                    leadingIcon = AppIcons.Call,
                )
                AppButton(
                    stringResource(Res.string.details_whatsapp),
                    { onAction(UiAction.OnWhatsAppCustomer) },
                    kind = ButtonKind.Secondary,
                    leadingIcon = AppIcons.Chat,
                )
            }
        }
    }
}

@Composable
internal fun SectionCard(title: String, content: @Composable () -> Unit) {
    AppCard(modifier = Modifier.fillMaxWidth()) {
        Column(verticalArrangement = Arrangement.spacedBy(AppTheme.spacing.space6)) {
            AppText(text = title, style = AppTheme.typography.labelLarge, color = AppTheme.colors.accent)
            content()
        }
    }
}

@Composable
private fun ReasonLine(label: String, reason: String) {
    AppText(text = label, style = AppTheme.typography.labelMedium, color = AppTheme.colors.danger)
    AppText(text = reason, style = AppTheme.typography.bodySmall)
}

private fun refundNote(status: RefundStatus) = when (status) {
    RefundStatus.REFUND_PENDING -> Res.string.details_refund_pending
    RefundStatus.REFUNDED -> Res.string.details_refund_done
    RefundStatus.REFUND_FAILED -> Res.string.details_refund_failed
    RefundStatus.NONE -> null
}

@Composable
private fun com.fab.wab.merchant.feature.bookings.domain.model.StatusChange.toUi(): StatusHistoryEntryUi {
    val time = at?.let { dateTimeText(it) }
    val title = status?.let { bookingStatusLabel(it) }.orEmpty()
    return StatusHistoryEntryUi(
        title = title,
        actor = actorLabel(actorType)?.let { stringResource(it) } ?: actorType,
        time = time?.let { stringResource(Res.string.history_line, it.date, it.time) }.orEmpty(),
        note = reason,
    )
}

/** BUSINESS_DOMAIN §1 `ActorType`; an unknown value is shown as sent. */
private fun actorLabel(actorType: String) = when (actorType.uppercase()) {
    ACTOR_CUSTOMER -> Res.string.actor_customer
    ACTOR_MEMBER -> Res.string.actor_member
    ACTOR_ADMIN -> Res.string.actor_admin
    ACTOR_SYSTEM -> Res.string.actor_system
    else -> null
}

private const val ACTOR_CUSTOMER = "CUSTOMER"
private const val ACTOR_MEMBER = "MEMBER"
private const val ACTOR_ADMIN = "ADMIN"
private const val ACTOR_SYSTEM = "SYSTEM"

private const val CONTACT_BUTTONS = 2
