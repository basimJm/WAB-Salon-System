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
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.text.font.FontWeight
import com.fab.wab.merchant.core.domain.booking.BookingStatus
import com.fab.wab.merchant.designsystem.components.avatar.AppAvatar
import com.fab.wab.merchant.designsystem.components.divider.AppDivider
import com.fab.wab.merchant.designsystem.components.glass.glassBackground
import com.fab.wab.merchant.designsystem.components.text.AppText
import com.fab.wab.merchant.designsystem.icons.AppIcons
import com.fab.wab.merchant.designsystem.resources.Res
import com.fab.wab.merchant.designsystem.resources.booking_persons
import com.fab.wab.merchant.designsystem.resources.meta_pair
import com.fab.wab.merchant.designsystem.resources.request_bride_subtitle
import com.fab.wab.merchant.designsystem.resources.request_bride_title
import com.fab.wab.merchant.designsystem.resources.request_handled_approved
import com.fab.wab.merchant.designsystem.resources.request_handled_by
import com.fab.wab.merchant.designsystem.resources.request_handled_closing
import com.fab.wab.merchant.designsystem.resources.request_handled_rejected
import com.fab.wab.merchant.designsystem.resources.request_total
import com.fab.wab.merchant.designsystem.theme.AppTheme
import com.fab.wab.merchant.designsystem.theme.GlassStyle
import org.jetbrains.compose.resources.pluralStringResource
import org.jetbrains.compose.resources.stringResource

/** Rose "Bridal booking — high priority" banner of the request sheet. */
@Composable
internal fun BrideBanner(modifier: Modifier = Modifier) {
    val colors = AppTheme.colors
    val spacing = AppTheme.spacing
    Row(
        modifier = modifier
            .fillMaxWidth()
            .background(Brush.linearGradient(listOf(colors.brideStart, colors.brideEnd)), AppTheme.shapes.large)
            .padding(horizontal = spacing.space14, vertical = spacing.space10),
        horizontalArrangement = Arrangement.spacedBy(spacing.space10),
        verticalAlignment = Alignment.CenterVertically,
    ) {
        Icon(AppIcons.Crown, contentDescription = null, tint = colors.onGradient, modifier = Modifier.size(AppTheme.sizes.icon))
        Column(modifier = Modifier.weight(1f)) {
            AppText(
                text = stringResource(Res.string.request_bride_title),
                style = AppTheme.typography.titleSmall.copy(fontWeight = FontWeight.Bold),
                color = colors.onGradient,
            )
            AppText(
                text = stringResource(Res.string.request_bride_subtitle),
                style = AppTheme.typography.labelSmall,
                color = colors.onGradient,
            )
        }
    }
}

/** Customer, persons count and the appointment time (accent) on the soft surface. */
@Composable
internal fun CustomerSummary(request: BookingRequestUi, modifier: Modifier = Modifier) {
    val colors = AppTheme.colors
    val spacing = AppTheme.spacing
    Row(
        modifier = modifier
            .fillMaxWidth()
            .glassBackground(AppTheme.glass, AppTheme.shapes.large, GlassStyle.Subtle)
            .padding(horizontal = spacing.space14, vertical = spacing.space12),
        horizontalArrangement = Arrangement.spacedBy(spacing.space12),
        verticalAlignment = Alignment.CenterVertically,
    ) {
        AppAvatar(name = request.customerName, size = AppTheme.sizes.requestAvatar)
        Column(modifier = Modifier.weight(1f)) {
            AppText(text = request.customerName, style = AppTheme.typography.titleSmall.copy(fontWeight = FontWeight.Bold), maxLines = 1)
            AppText(
                text = pluralStringResource(Res.plurals.booking_persons, request.personsCount, request.personsCount),
                style = AppTheme.typography.bodySmall,
                color = colors.muted,
            )
        }
        Column(horizontalAlignment = Alignment.End) {
            AppText(text = request.time, style = AppTheme.typography.titleSmall.copy(fontWeight = FontWeight.Bold), color = colors.accent)
            AppText(text = request.date, style = AppTheme.typography.labelSmall, color = colors.muted)
        }
    }
}

/** One person: name (+ bride badge), services, staff · time. */
@Composable
internal fun RequestPersonCard(person: RequestPersonUi, modifier: Modifier = Modifier) {
    val colors = AppTheme.colors
    val spacing = AppTheme.spacing
    Column(
        modifier = modifier
            .fillMaxWidth()
            .glassBackground(AppTheme.glass, AppTheme.shapes.medium)
            .padding(horizontal = spacing.space12, vertical = spacing.space10),
        verticalArrangement = Arrangement.spacedBy(spacing.space2),
    ) {
        Row(horizontalArrangement = Arrangement.spacedBy(spacing.space6), verticalAlignment = Alignment.CenterVertically) {
            AppText(text = person.name, style = AppTheme.typography.labelMedium.copy(fontWeight = FontWeight.Bold), maxLines = 1)
            if (person.isBride) AppBrideBadge()
        }
        AppText(text = person.services, style = AppTheme.typography.bodySmall, color = colors.muted)
        AppText(
            text = stringResource(Res.string.meta_pair, person.staff, person.whenText),
            style = AppTheme.typography.labelSmall,
            color = colors.faint,
        )
    }
}

/** Divider, then the total on the start side and the payment badge on the end side. */
@Composable
internal fun TotalLine(request: BookingRequestUi, modifier: Modifier = Modifier) {
    val spacing = AppTheme.spacing
    Column(modifier = modifier.fillMaxWidth()) {
        AppDivider()
        Row(
            modifier = Modifier.fillMaxWidth().padding(top = spacing.space12, bottom = spacing.space6),
            verticalAlignment = Alignment.CenterVertically,
        ) {
            Column(modifier = Modifier.weight(1f)) {
                AppText(
                    text = stringResource(Res.string.request_total),
                    style = AppTheme.typography.bodySmall,
                    color = AppTheme.colors.muted,
                )
                AppText(text = request.total, style = AppTheme.typography.headlineSmall.copy(fontWeight = FontWeight.Bold), maxLines = 1)
            }
            val payment = request.payment
            if (payment != null) AppPaymentBadge(payment)
        }
    }
}

/** Dark toast over the dimmed request: "This request was handled by {member}" + what happens next. */
@Composable
internal fun HandledToast(handledBy: HandledBy, modifier: Modifier = Modifier) {
    val colors = AppTheme.colors
    val spacing = AppTheme.spacing
    val closing = when (handledBy.outcome) {
        BookingStatus.APPROVED -> Res.string.request_handled_approved
        BookingStatus.REJECTED -> Res.string.request_handled_rejected
        else -> Res.string.request_handled_closing
    }
    Row(
        modifier = modifier
            .fillMaxWidth()
            .background(colors.ink, AppTheme.shapes.large)
            .padding(spacing.space16),
        horizontalArrangement = Arrangement.spacedBy(spacing.space12),
        verticalAlignment = Alignment.CenterVertically,
    ) {
        Box(
            modifier = Modifier.size(AppTheme.sizes.avatarSmall).background(colors.success, AppTheme.shapes.circle),
            contentAlignment = Alignment.Center,
        ) {
            Icon(AppIcons.Check, contentDescription = null, tint = colors.onGradient, modifier = Modifier.size(AppTheme.sizes.icon))
        }
        Column(modifier = Modifier.weight(1f)) {
            AppText(
                text = stringResource(Res.string.request_handled_by, handledBy.memberName),
                style = AppTheme.typography.labelLarge,
                color = colors.background,
            )
            AppText(text = stringResource(closing), style = AppTheme.typography.bodySmall, color = colors.background)
        }
    }
}
