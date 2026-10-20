package com.fab.wab.customer.feature.notifications.presentation.screen

import com.fab.wab.customer.designsystem.icons.AppIcons
import com.fab.wab.customer.designsystem.components.textfield.DatePickerDates
import com.fab.wab.customer.designsystem.components.textfield.AppDatePickerDialog
import androidx.compose.ui.text.TextStyle
import androidx.compose.ui.semantics.Role
import androidx.compose.ui.draw.clip
import androidx.compose.runtime.setValue
import androidx.compose.runtime.remember
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.getValue
import androidx.compose.material3.Icon
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.clickable
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.text.BasicTextField
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.SolidColor
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.Dp
import com.fab.wab.customer.designsystem.components.dialog.AppBottomSheet
import com.fab.wab.customer.designsystem.components.text.AppText
import com.fab.wab.customer.designsystem.theme.AppTheme
import com.fab.wab.customer.feature.notifications.presentation.controller.contract.FilterDraft
import com.fab.wab.customer.feature.notifications.presentation.controller.contract.NotificationsContract.UiAction
import com.fab.wab.customer.feature.notifications.presentation.resources.Res
import com.fab.wab.customer.feature.notifications.presentation.resources.notifications_apply
import com.fab.wab.customer.feature.notifications.presentation.resources.notifications_dates_error
import com.fab.wab.customer.feature.notifications.presentation.resources.notifications_filter_title
import com.fab.wab.customer.feature.notifications.presentation.resources.notifications_from_label
import com.fab.wab.customer.feature.notifications.presentation.resources.notifications_reset
import com.fab.wab.customer.feature.notifications.presentation.resources.notifications_search_hint
import com.fab.wab.customer.feature.notifications.presentation.resources.notifications_search_label
import com.fab.wab.customer.feature.notifications.presentation.resources.notifications_to_label
import org.jetbrains.compose.resources.stringResource

/** Sheet scaffold of the design: card background, 26 px top radius, `padding:10px 20px 34px`, centred bold title. */
@Composable
internal fun NotificationsSheet(title: String, onDismiss: () -> Unit, content: @Composable () -> Unit) {
    AppBottomSheet(onDismiss = onDismiss) {
        Column(
            modifier = Modifier
                .fillMaxWidth()
                .padding(
                    start = NotificationsDesign.sheetHorizontal,
                    end = NotificationsDesign.sheetHorizontal,
                    bottom = NotificationsDesign.sheetBottom,
                ),
        ) {
            AppText(
                text = title,
                style = AppTheme.typography.titleMedium.copy(fontSize = NotificationsDesign.sheetTitleSize, fontWeight = FontWeight.Bold),
                textAlign = TextAlign.Center,
                modifier = Modifier.fillMaxWidth().padding(bottom = NotificationsDesign.sheetTitleBottom),
            )
            content()
        }
    }
}

/** S19 filter sheet: From / To open the calendar picker (ISO dates in the draft), search, Reset (1/3) + Apply (2/3). */
@Composable
internal fun NotificationsFilterSheet(draft: FilterDraft, onAction: (UiAction) -> Unit) {
    var picking by remember { mutableStateOf<DateEnd?>(null) }
    picking?.let { end ->
        AppDatePickerDialog(
            initialIsoDate = if (end == DateEnd.FROM) draft.from else draft.to,
            onConfirm = { iso ->
                onAction(if (end == DateEnd.FROM) UiAction.OnDraftFromChange(iso) else UiAction.OnDraftToChange(iso))
                picking = null
            },
            onDismiss = { picking = null },
        )
    }
    NotificationsSheet(title = stringResource(Res.string.notifications_filter_title), onDismiss = { onAction(UiAction.OnSheetDismiss) }) {
        Row(
            modifier = Modifier.fillMaxWidth().padding(bottom = NotificationsDesign.dateRowBottom),
            horizontalArrangement = Arrangement.spacedBy(NotificationsDesign.sheetButtonGap),
        ) {
            SheetField(
                label = stringResource(Res.string.notifications_from_label),
                value = DatePickerDates.display(draft.from),
                onValueChange = {},
                modifier = Modifier.weight(1f),
                onClick = { picking = DateEnd.FROM },
                horizontalPadding = NotificationsDesign.dateFieldPadding,
            )
            SheetField(
                label = stringResource(Res.string.notifications_to_label),
                value = DatePickerDates.display(draft.to),
                onValueChange = {},
                modifier = Modifier.weight(1f),
                onClick = { picking = DateEnd.TO },
                horizontalPadding = NotificationsDesign.dateFieldPadding,
                error = if (draft.datesValid) null else stringResource(Res.string.notifications_dates_error),
            )
        }
        SheetField(
            label = stringResource(Res.string.notifications_search_label),
            value = draft.query,
            onValueChange = { onAction(UiAction.OnDraftQueryChange(it)) },
            modifier = Modifier.fillMaxWidth().padding(bottom = NotificationsDesign.searchBottom),
            horizontalPadding = NotificationsDesign.searchFieldPadding,
            placeholder = stringResource(Res.string.notifications_search_hint),
        )
        Row(horizontalArrangement = Arrangement.spacedBy(NotificationsDesign.sheetButtonGap)) {
            OutlineButton(
                text = stringResource(Res.string.notifications_reset),
                onClick = { onAction(UiAction.OnResetFilters) },
                modifier = Modifier.weight(1f),
            )
            GradientButton(
                text = stringResource(Res.string.notifications_apply),
                onClick = { onAction(UiAction.OnApplyFilters) },
                modifier = Modifier.weight(NotificationsDesign.applyWeight),
                enabled = draft.datesValid,
            )
        }
    }
}

/** Accent 12/600 label over a 48 px field (`border-radius:14px;border:1.5px solid var(--line)`), error 11.5 below. */
@Composable
private fun SheetField(
    label: String,
    value: String,
    onValueChange: (String) -> Unit,
    modifier: Modifier = Modifier,
    horizontalPadding: Dp = NotificationsDesign.searchFieldPadding,
    placeholder: String? = null,
    error: String? = null,
    onClick: (() -> Unit)? = null,
) {
    val colors = AppTheme.colors
    val shape = AppTheme.shapes.medium
    val textStyle = AppTheme.typography.bodyMedium.copy(fontSize = NotificationsDesign.fieldTextSize, color = colors.ink)
    Column(modifier = modifier) {
        AppText(
            text = label,
            style = AppTheme.typography.labelMedium.copy(fontSize = NotificationsDesign.fieldLabelSize, fontWeight = FontWeight.SemiBold),
            color = colors.accent,
            modifier = Modifier.padding(bottom = NotificationsDesign.fieldLabelBottom),
        )
        if (onClick != null) {
            DateBox(value, error != null, horizontalPadding, textStyle, onClick)
        } else BasicTextField(
            value = value,
            onValueChange = onValueChange,
            modifier = Modifier.fillMaxWidth(),
            textStyle = textStyle,
            singleLine = true,
            cursorBrush = SolidColor(colors.accent),
            decorationBox = { inner ->
                Box(
                    modifier = Modifier
                        .fillMaxWidth()
                        .height(NotificationsDesign.fieldHeight)
                        .background(colors.card, shape)
                        .border(AppTheme.sizes.borderWidth, if (error != null) colors.danger else colors.line, shape)
                        .padding(horizontal = horizontalPadding),
                    contentAlignment = Alignment.CenterStart,
                ) {
                    if (value.isEmpty() && placeholder != null) {
                        AppText(text = placeholder, style = textStyle, color = colors.faint, maxLines = 1)
                    }
                    inner()
                }
            },
        )
        if (error != null) {
            AppText(
                text = error,
                style = AppTheme.typography.bodySmall.copy(fontSize = NotificationsDesign.fieldErrorSize),
                color = colors.danger,
                modifier = Modifier.padding(top = NotificationsDesign.fieldErrorTop),
            )
        }
    }
}

private enum class DateEnd { FROM, TO }

/** Same 48 px field look, read-only: tapping it opens the calendar; the calendar icon sits at the end. */
@Composable
private fun DateBox(value: String, hasError: Boolean, horizontalPadding: Dp, textStyle: TextStyle, onClick: () -> Unit) {
    val colors = AppTheme.colors
    val shape = AppTheme.shapes.medium
    Row(
        modifier = Modifier
            .fillMaxWidth()
            .height(NotificationsDesign.fieldHeight)
            .clip(shape)
            .background(colors.card, shape)
            .border(AppTheme.sizes.borderWidth, if (hasError) colors.danger else colors.line, shape)
            .clickable(role = Role.Button, onClick = onClick)
            .padding(horizontal = horizontalPadding),
        verticalAlignment = Alignment.CenterVertically,
    ) {
        AppText(text = value, style = textStyle, maxLines = 1, modifier = Modifier.weight(1f))
        Icon(AppIcons.Bookings, contentDescription = null, tint = colors.muted, modifier = Modifier.size(AppTheme.sizes.iconSmall))
    }
}
