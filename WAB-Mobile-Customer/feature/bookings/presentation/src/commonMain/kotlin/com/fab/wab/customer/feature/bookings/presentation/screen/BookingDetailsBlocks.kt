package com.fab.wab.customer.feature.bookings.presentation.screen

import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.Icon
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.platform.LocalClipboardManager
import androidx.compose.ui.semantics.Role
import androidx.compose.ui.text.AnnotatedString
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.text.style.TextDirection
import com.fab.wab.customer.core.common.TimeFormat
import com.fab.wab.customer.core.domain.booking.BookingDetails
import com.fab.wab.customer.core.domain.booking.BookingPerson
import com.fab.wab.customer.core.domain.booking.BookingStatus
import com.fab.wab.customer.core.domain.booking.RefundStatus
import com.fab.wab.customer.designsystem.components.badge.AppStatusBadge
import com.fab.wab.customer.designsystem.components.badge.StatusTone
import com.fab.wab.customer.designsystem.components.text.AppText
import com.fab.wab.customer.designsystem.icons.AppIcons
import com.fab.wab.customer.designsystem.resources.Res as CoreRes
import com.fab.wab.customer.designsystem.resources.price_jod
import com.fab.wab.customer.designsystem.resources.time_am
import com.fab.wab.customer.designsystem.resources.time_pm
import com.fab.wab.customer.designsystem.theme.AppTheme
import com.fab.wab.customer.feature.bookings.presentation.controller.contract.BookingDetailsContract.UiAction
import com.fab.wab.customer.feature.bookings.presentation.controller.contract.BookingDetailsContract.UiState
import com.fab.wab.customer.feature.bookings.presentation.resources.Res
import com.fab.wab.customer.feature.bookings.presentation.resources.details_auto_cancel_reason
import com.fab.wab.customer.feature.bookings.presentation.resources.details_bride
import com.fab.wab.customer.feature.bookings.presentation.resources.details_call
import com.fab.wab.customer.feature.bookings.presentation.resources.details_cancellation_reason
import com.fab.wab.customer.feature.bookings.presentation.resources.details_copied
import com.fab.wab.customer.feature.bookings.presentation.resources.details_copy
import com.fab.wab.customer.feature.bookings.presentation.resources.details_reference
import com.fab.wab.customer.feature.bookings.presentation.resources.details_refund_failed
import com.fab.wab.customer.feature.bookings.presentation.resources.details_refund_pending
import com.fab.wab.customer.feature.bookings.presentation.resources.details_refunded
import com.fab.wab.customer.feature.bookings.presentation.resources.details_rejection_reason
import com.fab.wab.customer.feature.bookings.presentation.resources.details_staff
import com.fab.wab.customer.feature.bookings.presentation.resources.details_staff_any
import com.fab.wab.customer.feature.bookings.presentation.resources.details_whatsapp
import org.jetbrains.compose.resources.stringResource

/**
 * Design status block: `padding:16px;border-radius:20px;background:var(--surface)`; badges (status, payment, refund) with a 6 px
 * gap; "Reference number" 11.5 px muted over the bold 16 px LTR reference; soft 36 px "Copy" button that turns into "Copied".
 */
@Suppress("DEPRECATION") // LocalClipboard is suspend-only; the common plain-text ClipEntry helper is not yet stable in CMP 1.10
@Composable
internal fun StatusBlock(booking: BookingDetails) {
    val colors = AppTheme.colors
    val spacing = AppTheme.spacing
    val clipboard = LocalClipboardManager.current
    var copied by remember(booking.referenceNumber) { mutableStateOf(false) }
    Column(
        modifier = Modifier
            .fillMaxWidth()
            .background(colors.surface, RoundedCornerShape(BookingsDesign.statusBlockRadius))
            .padding(spacing.space16),
    ) {
        Row(horizontalArrangement = Arrangement.spacedBy(spacing.space6), modifier = Modifier.padding(bottom = spacing.space12)) {
            val (statusRes, tone) = booking.status.label()
            AppStatusBadge(text = stringResource(statusRes), tone = tone)
            AppStatusBadge(text = stringResource(booking.paymentStatus.label()), tone = StatusTone.Accent)
            booking.refundStatus.badge()?.let { (res, refundTone) -> AppStatusBadge(text = stringResource(res), tone = refundTone) }
        }
        Row(modifier = Modifier.fillMaxWidth(), verticalAlignment = Alignment.CenterVertically) {
            Column(modifier = Modifier.weight(1f)) {
                AppText(
                    text = stringResource(Res.string.details_reference),
                    style = AppTheme.typography.bodySmall.copy(fontSize = BookingsDesign.fontLabel),
                    color = colors.muted,
                )
                AppText(
                    text = booking.referenceNumber,
                    style = AppTheme.typography.titleMedium.copy(
                        fontWeight = FontWeight.Bold,
                        letterSpacing = BookingsDesign.referenceLetterSpacing,
                        textDirection = TextDirection.Ltr,
                    ),
                    textAlign = TextAlign.Start,
                    maxLines = 1,
                )
            }
            Box(
                modifier = Modifier
                    .height(BookingsDesign.copyButtonHeight)
                    .background(colors.soft, RoundedCornerShape(BookingsDesign.copyButtonRadius))
                    .clickable(role = Role.Button) {
                        clipboard.setText(AnnotatedString(booking.referenceNumber))
                        copied = true
                    }
                    .padding(horizontal = spacing.space14),
                contentAlignment = Alignment.Center,
            ) {
                AppText(
                    text = stringResource(if (copied) Res.string.details_copied else Res.string.details_copy),
                    style = AppTheme.typography.labelMedium.copy(fontSize = BookingsDesign.fontCaption),
                    color = colors.accent,
                    maxLines = 1,
                )
            }
        }
    }
}

/** Design `b.hasReason`: rose-tinted 14 px card, 18 px rose info icon, bold rose title then the reason text (12.5 px). */
@Composable
internal fun ReasonBlock(booking: BookingDetails) {
    val reason = booking.rejection?.let { Res.string.details_rejection_reason to (it.text ?: it.code) }
        ?: booking.cancellation?.let { Res.string.details_cancellation_reason to (it.text ?: it.code) }
        ?: booking.status.takeIf { it == BookingStatus.AUTO_CANCELLED }?.let {
            Res.string.details_cancellation_reason to stringResource(Res.string.details_auto_cancel_reason)
        }
    val (titleRes, text) = reason ?: return
    val colors = AppTheme.colors
    val spacing = AppTheme.spacing
    val style = AppTheme.typography.bodySmall.copy(fontSize = BookingsDesign.fontCaption, lineHeight = BookingsDesign.lineHeightBody)
    Row(
        modifier = Modifier
            .fillMaxWidth()
            .background(colors.dangerContainer, AppTheme.shapes.medium)
            .padding(horizontal = spacing.space14, vertical = spacing.space12),
        horizontalArrangement = Arrangement.spacedBy(spacing.space10),
    ) {
        Icon(
            imageVector = AppIcons.Info,
            contentDescription = null,
            tint = colors.danger,
            modifier = Modifier.padding(top = spacing.space2).size(BookingsDesign.reasonIcon),
        )
        Column {
            AppText(text = stringResource(titleRes), style = style.copy(fontWeight = FontWeight.Bold), color = colors.danger)
            AppText(text = text, style = style)
        }
    }
}

/** Design salon card: bordered 18 px card, 52 px thumb, bold name, soft Call and green WhatsApp 42 px icon buttons. */
@Composable
internal fun SalonBlock(booking: BookingDetails, state: UiState, onAction: (UiAction) -> Unit) {
    val colors = AppTheme.colors
    val spacing = AppTheme.spacing
    val salonName = booking.salonName.orEmpty()
    DesignCard {
        Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(spacing.space12)) {
            SalonThumb(name = salonName, imageUrl = state.salonImageUrl)
            Column(modifier = Modifier.weight(1f)) {
                AppText(
                    text = salonName,
                    style = AppTheme.typography.titleSmall.copy(fontSize = BookingsDesign.fontTitle, fontWeight = FontWeight.Bold),
                )
                BookedBranchLines(booking.branch)
            }
            if (state.salonPhone != null) {
                TintedIconButton(
                    icon = AppIcons.Call,
                    contentDescription = stringResource(Res.string.details_call),
                    container = colors.soft,
                    tint = colors.accent,
                    onClick = { onAction(UiAction.OnCallClick) },
                )
            }
            if (state.salonWhatsApp != null) {
                TintedIconButton(
                    icon = AppIcons.Chat,
                    contentDescription = stringResource(Res.string.details_whatsapp),
                    container = colors.successContainer,
                    tint = colors.success,
                    onClick = { onAction(UiAction.OnWhatsAppClick) },
                )
            }
        }
    }
}

/** Design person card: bold name + bride chip, service / price lines, dashed footer with staff and date · time (12 px muted). */
@Composable
internal fun PersonCard(person: BookingPerson) {
    val colors = AppTheme.colors
    val spacing = AppTheme.spacing
    val am = stringResource(CoreRes.string.time_am)
    val pm = stringResource(CoreRes.string.time_pm)
    val start = TimeFormat.instantText(person.start, am, pm)
    val lineStyle = AppTheme.typography.bodyMedium.copy(fontSize = BookingsDesign.fontBody)
    DesignCard {
        Column {
            Row(
                verticalAlignment = Alignment.CenterVertically,
                horizontalArrangement = Arrangement.spacedBy(spacing.space6),
                modifier = Modifier.padding(bottom = spacing.space8),
            ) {
                AppText(text = person.name, style = AppTheme.typography.titleSmall.copy(fontWeight = FontWeight.Bold))
                if (person.isBride) BrideChip()
            }
            person.services.forEach { service ->
                Row(
                    modifier = Modifier.fillMaxWidth().padding(vertical = BookingsDesign.lineVerticalPadding),
                    horizontalArrangement = Arrangement.SpaceBetween,
                ) {
                    AppText(text = service.name, style = lineStyle, modifier = Modifier.weight(1f))
                    AppText(
                        text = stringResource(CoreRes.string.price_jod, service.price),
                        style = lineStyle.copy(fontWeight = FontWeight.SemiBold),
                    )
                }
            }
            Row(
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(top = spacing.space8)
                    .dashedTopBorder(colors.line, AppTheme.sizes.hairline)
                    .padding(top = spacing.space8),
                horizontalArrangement = Arrangement.spacedBy(spacing.space14),
            ) {
                AppText(
                    text = stringResource(Res.string.details_staff, person.staffName ?: stringResource(Res.string.details_staff_any)),
                    style = AppTheme.typography.bodySmall,
                    color = colors.muted,
                )
                AppText(
                    text = listOfNotNull(start?.date, start?.time).joinToString(BookingsDesign.WHEN_SEPARATOR),
                    style = AppTheme.typography.bodySmall,
                    color = colors.muted,
                )
            }
        }
    }
}

/** Design bride chip: 10.5 px bold, `padding:2px 8px;border-radius:6px`, rose tint. */
@Composable
private fun BrideChip() {
    AppText(
        text = stringResource(Res.string.details_bride),
        style = AppTheme.typography.labelSmall.copy(fontSize = BookingsDesign.fontChip, fontWeight = FontWeight.Bold),
        color = AppTheme.colors.onDangerContainer,
        modifier = Modifier
            .background(AppTheme.colors.dangerContainer, AppTheme.shapes.extraSmall)
            .padding(horizontal = AppTheme.spacing.space8, vertical = AppTheme.spacing.space2),
    )
}

/** Refund badge (design `rf`): green when refunded, amber while pending, rose when failed. */
private fun RefundStatus.badge() = when (this) {
    RefundStatus.REFUND_PENDING -> Res.string.details_refund_pending to StatusTone.Warning
    RefundStatus.REFUNDED -> Res.string.details_refunded to StatusTone.Success
    RefundStatus.REFUND_FAILED -> Res.string.details_refund_failed to StatusTone.Danger
    RefundStatus.NONE, RefundStatus.UNKNOWN -> null
}
