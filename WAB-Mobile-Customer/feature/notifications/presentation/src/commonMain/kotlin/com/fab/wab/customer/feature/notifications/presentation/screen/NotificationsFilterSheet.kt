package com.fab.wab.customer.feature.notifications.presentation.screen

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

/** S19 filter sheet: From / To (ISO dates until a date picker exists), search, Reset (1/3) + Apply (2/3). */
@Composable
internal fun NotificationsFilterSheet(draft: FilterDraft, onAction: (UiAction) -> Unit) {
    NotificationsSheet(title = stringResource(Res.string.notifications_filter_title), onDismiss = { onAction(UiAction.OnSheetDismiss) }) {
        Row(
            modifier = Modifier.fillMaxWidth().padding(bottom = NotificationsDesign.dateRowBottom),
            horizontalArrangement = Arrangement.spacedBy(NotificationsDesign.sheetButtonGap),
        ) {
            SheetField(
                label = stringResource(Res.string.notifications_from_label),
                value = draft.from,
                onValueChange = { onAction(UiAction.OnDraftFromChange(it)) },
                modifier = Modifier.weight(1f),
                horizontalPadding = NotificationsDesign.dateFieldPadding,
            )
            SheetField(
                label = stringResource(Res.string.notifications_to_label),
                value = draft.to,
                onValueChange = { onAction(UiAction.OnDraftToChange(it)) },
                modifier = Modifier.weight(1f),
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
        BasicTextField(
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
