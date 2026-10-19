package com.fab.wab.customer.feature.booking.presentation.screen

import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.defaultMinSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.selection.selectable
import androidx.compose.runtime.Composable
import androidx.compose.runtime.CompositionLocalProvider
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.platform.LocalLayoutDirection
import androidx.compose.ui.semantics.Role
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.text.style.TextDecoration
import androidx.compose.ui.unit.LayoutDirection
import com.fab.wab.customer.designsystem.components.feedback.AppErrorState
import com.fab.wab.customer.designsystem.components.shimmer.AppShimmerBox
import com.fab.wab.customer.designsystem.components.text.AppText
import com.fab.wab.customer.designsystem.theme.AppTheme
import com.fab.wab.customer.designsystem.utils.brandBackground
import com.fab.wab.customer.designsystem.utils.brandBrush
import com.fab.wab.customer.feature.booking.domain.model.AvailabilitySlot
import com.fab.wab.customer.feature.booking.presentation.controller.contract.BookingFlowContract.UiAction
import com.fab.wab.customer.feature.booking.presentation.controller.contract.BookingFlowContract.UiState
import com.fab.wab.customer.feature.booking.presentation.resources.Res
import com.fab.wab.customer.feature.booking.presentation.resources.booking_no_slots
import com.fab.wab.customer.feature.booking.presentation.resources.booking_slot_full
import com.fab.wab.customer.feature.booking.presentation.resources.booking_slots_title
import org.jetbrains.compose.resources.stringResource

/**
 * Design `hasDate`: header row (`"Available times" 15px 700` + duration `12px muted`, `margin:20px 0 10px`), then
 * twelve 42 dp shimmer cells, the "no slots" box, or the four-column slot grid (`gap:8px`).
 */
@Composable
internal fun SlotTimes(state: UiState, onAction: (UiAction) -> Unit, modifier: Modifier = Modifier) {
    val spacing = AppTheme.spacing
    val availability = state.availability
    val duration = availability?.durationMinutes ?: state.totals.durationMinutes
    Column(modifier = modifier.fillMaxWidth()) {
        Row(
            modifier = Modifier.fillMaxWidth().padding(bottom = spacing.space10),
            horizontalArrangement = Arrangement.SpaceBetween,
            verticalAlignment = Alignment.CenterVertically,
        ) {
            AppText(text = stringResource(Res.string.booking_slots_title), style = AppTheme.typography.titleMedium)
            AppText(text = durationText(duration), style = AppTheme.typography.bodySmall, color = AppTheme.colors.muted)
        }
        when {
            state.slotsLoading -> SlotGrid(List(SHIMMER_SLOTS) { null }) { SlotShimmer() }
            state.slotsError != null ->
                AppErrorState(onRetry = { state.selectedDate?.let { onAction(UiAction.OnDateSelect(it)) } }, message = state.slotsError)
            availability == null || !availability.hasAvailableSlot -> NoSlotsBox()
            else -> SlotGrid(availability.slots) { slot ->
                SlotChip(
                    slot = slot,
                    selected = state.person.start == slot.start,
                    onClick = { onAction(UiAction.OnSlotSelect(slot.start)) },
                )
            }
        }
    }
}

/** `grid-template-columns:repeat(4,1fr);gap:8px` as rows of four equal cells. */
@Composable
private fun <T> SlotGrid(items: List<T>, cell: @Composable (T) -> Unit) {
    val gap = AppTheme.spacing.space8
    Column(verticalArrangement = Arrangement.spacedBy(gap)) {
        items.chunked(SLOT_COLUMNS).forEach { row ->
            Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(gap)) {
                row.forEach { item -> Box(Modifier.weight(1f)) { cell(item) } }
                repeat(SLOT_COLUMNS - row.size) { Box(Modifier.weight(1f)) }
            }
        }
    }
}

@Composable
private fun SlotShimmer() {
    AppShimmerBox(
        modifier = Modifier.fillMaxWidth().height(BookingDesignConstants.slotHeight),
        shape = roundedShape(BookingDesignConstants.slotRadius),
    )
}

/** Design `dayFull`: `padding:22px;border-radius:16px;background:var(--surface);text-align:center;font-size:13.5px muted`. */
@Composable
private fun NoSlotsBox() {
    AppText(
        text = stringResource(Res.string.booking_no_slots),
        modifier = Modifier
            .fillMaxWidth()
            .clip(AppTheme.shapes.large)
            .background(AppTheme.colors.surface)
            .padding(BookingDesignConstants.noSlotsPadding),
        style = AppTheme.typography.bodyMedium,
        color = AppTheme.colors.muted,
        textAlign = TextAlign.Center,
    )
}

/**
 * Design slot chip: `min-height:42px;padding:4px 2px;border-radius:12px;border:1.5px solid (sel ? #A855F7 : line)`,
 * gradient + white when selected, `surface` + faint + line-through + "Full" (`9.5px`) when full, `card` + ink otherwise.
 * Times always read left to right (`dir="ltr"`).
 */
@Composable
private fun SlotChip(slot: AvailabilitySlot, selected: Boolean, onClick: () -> Unit, modifier: Modifier = Modifier) {
    val colors = AppTheme.colors
    val shape = roundedShape(BookingDesignConstants.slotRadius)
    val full = !slot.available
    val fill = when {
        selected -> Modifier.brandBackground(brandBrush(), shape)
        full -> Modifier.clip(shape).background(colors.surface)
        else -> Modifier.clip(shape).background(colors.card)
    }
    val content = when {
        selected -> colors.onGradient
        full -> colors.faint
        else -> colors.ink
    }
    val label = slotTimeText(slot.start) ?: slot.start
    Column(
        modifier = modifier
            .fillMaxWidth()
            .defaultMinSize(minHeight = BookingDesignConstants.slotHeight)
            .then(fill)
            .border(AppTheme.sizes.borderWidth, if (selected) colors.gradientEnd else colors.line, shape)
            .selectable(selected = selected, enabled = !full, role = Role.Button, onClick = onClick)
            .padding(horizontal = BookingDesignConstants.slotPaddingH, vertical = BookingDesignConstants.slotPaddingV),
        horizontalAlignment = Alignment.CenterHorizontally,
        verticalArrangement = Arrangement.Center,
    ) {
        CompositionLocalProvider(LocalLayoutDirection provides LayoutDirection.Ltr) {
            AppText(
                text = label,
                style = AppTheme.typography.labelMedium.copy(textDecoration = if (full) TextDecoration.LineThrough else null),
                color = content,
                maxLines = 1,
            )
        }
        if (full) {
            AppText(
                text = stringResource(Res.string.booking_slot_full),
                style = AppTheme.typography.labelSmall.copy(
                    fontSize = BookingDesignConstants.slotFullTextSize,
                    lineHeight = BookingDesignConstants.slotFullLineHeight,
                ),
                color = content,
                maxLines = 1,
            )
        }
    }
}

private const val SLOT_COLUMNS = 4
private const val SHIMMER_SLOTS = 12
