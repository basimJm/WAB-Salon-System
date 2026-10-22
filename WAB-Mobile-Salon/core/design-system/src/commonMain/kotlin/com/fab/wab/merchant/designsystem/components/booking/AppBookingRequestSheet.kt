package com.fab.wab.merchant.designsystem.components.booking

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.material3.Icon
import androidx.compose.runtime.Composable
import androidx.compose.runtime.CompositionLocalProvider
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.alpha
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.platform.LocalLayoutDirection
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.LayoutDirection
import com.fab.wab.merchant.designsystem.components.button.AppButton
import com.fab.wab.merchant.designsystem.components.button.ButtonKind
import com.fab.wab.merchant.designsystem.components.text.AppText
import com.fab.wab.merchant.designsystem.icons.AppIcons
import com.fab.wab.merchant.designsystem.resources.Res
import com.fab.wab.merchant.designsystem.resources.meta_pair
import com.fab.wab.merchant.designsystem.resources.request_accept
import com.fab.wab.merchant.designsystem.resources.request_accepted_body
import com.fab.wab.merchant.designsystem.resources.request_accepted_title
import com.fab.wab.merchant.designsystem.resources.request_done
import com.fab.wab.merchant.designsystem.resources.request_new_title
import com.fab.wab.merchant.designsystem.resources.request_next
import com.fab.wab.merchant.designsystem.resources.request_queue
import com.fab.wab.merchant.designsystem.resources.request_reject
import com.fab.wab.merchant.designsystem.resources.request_view_booking
import com.fab.wab.merchant.designsystem.resources.request_view_details
import com.fab.wab.merchant.designsystem.theme.AppTheme
import org.jetbrains.compose.resources.stringResource

private const val REJECT_WEIGHT = 1f
private const val ACCEPT_WEIGHT = 1.6f

/**
 * Body of the real-time booking request sheet (PRD M10, design 02 Home `sheetOn`): request summary with Accept /
 * Reject / View details, the "1 of 3" queue chip, the "handled by" state and the accepted confirmation. The host
 * (MER-028) puts it in `AppBottomSheet`, plays `RequestAlert` and answers [onAction].
 */
@Composable
fun AppBookingRequestSheetContent(
    state: RequestSheetUi,
    onAction: (RequestSheetAction) -> Unit,
    modifier: Modifier = Modifier,
) {
    when (state) {
        is RequestSheetUi.Request -> RequestContent(state, onAction, modifier)
        is RequestSheetUi.Accepted -> AcceptedContent(state, onAction, modifier)
    }
}

@Composable
private fun RequestContent(state: RequestSheetUi.Request, onAction: (RequestSheetAction) -> Unit, modifier: Modifier) {
    val spacing = AppTheme.spacing
    val request = state.request
    Box(modifier = modifier.fillMaxWidth()) {
        Column(
            modifier = Modifier.fillMaxWidth().alpha(if (state.handledBy != null) AppTheme.alpha.disabled else 1f),
            verticalArrangement = Arrangement.spacedBy(spacing.space10),
        ) {
            RequestHeader(request, state.queue)
            if (request.isBride) BrideBanner()
            CustomerSummary(request)
            request.persons.forEach { RequestPersonCard(it) }
            TotalLine(request)
            Row(horizontalArrangement = Arrangement.spacedBy(spacing.space10)) {
                AppButton(
                    text = stringResource(Res.string.request_reject),
                    onClick = { onAction(RequestSheetAction.Reject) },
                    kind = ButtonKind.Destructive,
                    enabled = state.canAct,
                    modifier = Modifier.weight(REJECT_WEIGHT),
                )
                AppButton(
                    text = stringResource(Res.string.request_accept),
                    onClick = { onAction(RequestSheetAction.Accept) },
                    kind = ButtonKind.Success,
                    enabled = state.handledBy == null,
                    loading = state.accepting,
                    leadingIcon = AppIcons.Check,
                    modifier = Modifier.weight(ACCEPT_WEIGHT),
                )
            }
            AppButton(
                text = stringResource(Res.string.request_view_details),
                onClick = { onAction(RequestSheetAction.ViewDetails) },
                kind = ButtonKind.Text,
                modifier = Modifier.fillMaxWidth(),
            )
        }
        val handledBy = state.handledBy
        if (handledBy != null) HandledToast(handledBy, Modifier.align(Alignment.Center))
    }
}

@Composable
private fun RequestHeader(request: BookingRequestUi, queue: RequestQueue) {
    val colors = AppTheme.colors
    val spacing = AppTheme.spacing
    Row(horizontalArrangement = Arrangement.spacedBy(spacing.space12), verticalAlignment = Alignment.CenterVertically) {
        Box(
            modifier = Modifier
                .size(AppTheme.sizes.requestIcon)
                .background(Brush.linearGradient(listOf(colors.gradientStart, colors.gradientEnd)), AppTheme.shapes.circle),
            contentAlignment = Alignment.Center,
        ) {
            Icon(AppIcons.Notifications, contentDescription = null, tint = colors.onGradient, modifier = Modifier.size(AppTheme.sizes.iconLarge))
        }
        Column(modifier = Modifier.weight(1f)) {
            AppText(text = stringResource(Res.string.request_new_title), style = AppTheme.typography.headlineMedium)
            AppText(
                text = stringResource(Res.string.meta_pair, pendingAgeText(request.age), request.reference),
                style = AppTheme.typography.bodySmall,
                color = colors.muted,
                maxLines = 1,
            )
        }
        if (queue.showsIndicator) {
            AppText(
                text = stringResource(Res.string.request_queue, queue.position, queue.size),
                style = AppTheme.typography.labelMedium.copy(fontWeight = FontWeight.Bold),
                color = colors.accent,
                maxLines = 1,
                modifier = Modifier
                    .background(colors.soft, AppTheme.shapes.small)
                    .padding(horizontal = spacing.space10, vertical = spacing.space4),
            )
        }
    }
}

@Composable
private fun AcceptedContent(state: RequestSheetUi.Accepted, onAction: (RequestSheetAction) -> Unit, modifier: Modifier) {
    val colors = AppTheme.colors
    val spacing = AppTheme.spacing
    Column(
        modifier = modifier.fillMaxWidth().padding(top = spacing.space10),
        horizontalAlignment = Alignment.CenterHorizontally,
        verticalArrangement = Arrangement.spacedBy(spacing.space8),
    ) {
        Box(
            modifier = Modifier.size(AppTheme.sizes.requestDone).background(colors.success, AppTheme.shapes.circle),
            contentAlignment = Alignment.Center,
        ) {
            Icon(AppIcons.Check, contentDescription = null, tint = colors.onGradient, modifier = Modifier.size(AppTheme.sizes.requestDoneIcon))
        }
        AppText(text = stringResource(Res.string.request_accepted_title), style = AppTheme.typography.headlineMedium, textAlign = TextAlign.Center)
        CompositionLocalProvider(LocalLayoutDirection provides LayoutDirection.Ltr) {
            AppText(text = state.reference, style = AppTheme.typography.titleSmall.copy(fontWeight = FontWeight.Bold), color = colors.accent)
        }
        AppText(
            text = stringResource(Res.string.request_accepted_body),
            style = AppTheme.typography.bodyMedium,
            color = colors.muted,
            textAlign = TextAlign.Center,
            modifier = Modifier.padding(bottom = spacing.space12),
        )
        if (state.hasNext) {
            AppButton(stringResource(Res.string.request_next), { onAction(RequestSheetAction.Next) }, Modifier.fillMaxWidth())
        }
        AppButton(
            text = stringResource(Res.string.request_view_booking),
            onClick = { onAction(RequestSheetAction.ViewBooking) },
            kind = if (state.hasNext) ButtonKind.Secondary else ButtonKind.Primary,
            modifier = Modifier.fillMaxWidth(),
        )
        AppButton(
            text = stringResource(Res.string.request_done),
            onClick = { onAction(RequestSheetAction.Done) },
            kind = ButtonKind.Text,
            modifier = Modifier.fillMaxWidth(),
        )
    }
}
