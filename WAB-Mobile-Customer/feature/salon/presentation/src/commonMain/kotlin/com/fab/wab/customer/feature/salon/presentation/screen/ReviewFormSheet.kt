package com.fab.wab.customer.feature.salon.presentation.screen

import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.heightIn
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.material3.Icon
import androidx.compose.runtime.Composable
import androidx.compose.runtime.CompositionLocalProvider
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.platform.LocalLayoutDirection
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.LayoutDirection
import com.fab.wab.customer.designsystem.components.button.AppPrimaryButton
import com.fab.wab.customer.designsystem.components.dialog.AppBottomSheet
import com.fab.wab.customer.designsystem.components.rating.AppRatingInput
import com.fab.wab.customer.designsystem.components.text.AppText
import com.fab.wab.customer.designsystem.components.textfield.AppTextField
import com.fab.wab.customer.designsystem.icons.AppIcons
import com.fab.wab.customer.designsystem.theme.AppTheme
import com.fab.wab.customer.designsystem.utils.brandBackground
import com.fab.wab.customer.designsystem.utils.brandBrush
import com.fab.wab.customer.feature.salon.presentation.controller.contract.ReviewsContract.ReviewForm
import com.fab.wab.customer.feature.salon.presentation.controller.contract.ReviewsContract.UiAction
import com.fab.wab.customer.feature.salon.presentation.resources.Res
import com.fab.wab.customer.feature.salon.presentation.resources.review_comment_hint
import com.fab.wab.customer.feature.salon.presentation.resources.review_done
import com.fab.wab.customer.feature.salon.presentation.resources.review_submit
import com.fab.wab.customer.feature.salon.presentation.resources.review_submitted
import com.fab.wab.customer.feature.salon.presentation.resources.salon_review_add
import org.jetbrains.compose.resources.stringResource

/** S09 sheet: title, 36 px star input (always LTR), comment field, gradient submit; success panel after submission. */
@Composable
internal fun ReviewFormSheet(form: ReviewForm, onAction: (UiAction) -> Unit) {
    val spacing = AppTheme.spacing
    AppBottomSheet(onDismiss = { onAction(UiAction.OnFormDismiss) }) {
        Column(
            modifier = Modifier
                .fillMaxWidth()
                .padding(start = spacing.space20, end = spacing.space20, bottom = SalonDesign.modalSheetBottom),
            horizontalAlignment = Alignment.CenterHorizontally,
        ) {
            if (form.submitted) SuccessPanel(onDone = { onAction(UiAction.OnFormDismiss) }) else FormFields(form, onAction)
        }
    }
}

@Composable
private fun FormFields(form: ReviewForm, onAction: (UiAction) -> Unit) {
    val spacing = AppTheme.spacing
    AppText(
        text = stringResource(Res.string.salon_review_add),
        style = AppTheme.typography.titleMedium.copy(fontWeight = FontWeight.Bold),
        textAlign = TextAlign.Center,
        modifier = Modifier.padding(bottom = spacing.space16),
    )
    CompositionLocalProvider(LocalLayoutDirection provides LayoutDirection.Ltr) {
        AppRatingInput(
            value = form.rating,
            onValueChange = { onAction(UiAction.OnRatingChange(it)) },
            modifier = Modifier.padding(bottom = SalonDesign.statGridVertical),
        )
    }
    AppTextField(
        value = form.comment,
        onValueChange = { onAction(UiAction.OnCommentChange(it)) },
        modifier = Modifier.fillMaxWidth().heightIn(min = SalonDesign.commentFieldHeight).padding(bottom = spacing.space16),
        placeholder = stringResource(Res.string.review_comment_hint),
        singleLine = false,
    )
    AppPrimaryButton(
        text = stringResource(Res.string.review_submit),
        onClick = { onAction(UiAction.OnSubmit) },
        modifier = Modifier.fillMaxWidth(),
        enabled = form.canSubmit,
        loading = form.submitting,
    )
}

/** Gradient check badge, "Thank you! Your review will appear after approval.", soft "Done". */
@Composable
private fun SuccessPanel(onDone: () -> Unit) {
    val spacing = AppTheme.spacing
    Column(
        modifier = Modifier
            .fillMaxWidth()
            .padding(top = spacing.space16, start = spacing.space10, end = spacing.space10, bottom = spacing.space6),
        horizontalAlignment = Alignment.CenterHorizontally,
    ) {
        Box(
            modifier = Modifier.size(SalonDesign.successBadge).brandBackground(brandBrush(), AppTheme.shapes.circle),
            contentAlignment = Alignment.Center,
        ) {
            Icon(
                imageVector = AppIcons.Check,
                contentDescription = null,
                tint = AppTheme.colors.onGradient,
                modifier = Modifier.size(SalonDesign.successIcon),
            )
        }
        AppText(
            text = stringResource(Res.string.review_submitted),
            style = AppTheme.typography.titleMedium.copy(fontWeight = FontWeight.Bold),
            textAlign = TextAlign.Center,
            modifier = Modifier.padding(top = spacing.space16, bottom = SalonDesign.statGridVertical),
        )
        SalonButton(
            text = stringResource(Res.string.review_done),
            onClick = onDone,
            modifier = Modifier.fillMaxWidth(),
            kind = SalonButtonKind.Soft,
            height = SalonDesign.doneButtonHeight,
        )
    }
}
