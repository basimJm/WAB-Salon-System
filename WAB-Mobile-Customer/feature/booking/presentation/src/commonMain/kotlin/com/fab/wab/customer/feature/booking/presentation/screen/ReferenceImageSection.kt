package com.fab.wab.customer.feature.booking.presentation.screen

import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import com.fab.wab.customer.designsystem.components.button.AppOutlinedButton
import com.fab.wab.customer.designsystem.components.button.AppTextButton
import com.fab.wab.customer.designsystem.components.image.AppLocalImage
import com.fab.wab.customer.designsystem.components.text.AppText
import com.fab.wab.customer.designsystem.theme.AppTheme
import com.fab.wab.customer.feature.booking.presentation.controller.contract.BookingFlowContract.UiAction
import com.fab.wab.customer.feature.booking.presentation.controller.contract.BookingFlowContract.UiState
import com.fab.wab.customer.feature.booking.presentation.resources.Res
import com.fab.wab.customer.feature.booking.presentation.resources.booking_reference_add
import com.fab.wab.customer.feature.booking.presentation.resources.booking_reference_hint
import com.fab.wab.customer.feature.booking.presentation.resources.booking_reference_preview
import com.fab.wab.customer.feature.booking.presentation.resources.booking_reference_remove
import com.fab.wab.customer.feature.booking.presentation.resources.booking_reference_title
import com.fab.wab.customer.feature.booking.presentation.resources.booking_reference_uploading
import org.jetbrains.compose.resources.stringResource

/**
 * Step 0 at a tattoo studio (BUSINESS_DOMAIN §5.23): one optional design image for this person — add from the gallery,
 * preview, remove. Hidden for every other business type.
 */
@Composable
internal fun ReferenceImageSection(state: UiState, onAction: (UiAction) -> Unit, modifier: Modifier = Modifier) {
    if (!state.allowsReference) return
    val spacing = AppTheme.spacing
    val image = state.person.referenceImage
    Column(modifier = modifier.fillMaxWidth()) {
        AppText(
            text = stringResource(Res.string.booking_reference_title),
            modifier = Modifier.padding(bottom = spacing.space4),
            style = AppTheme.typography.labelMedium,
            color = AppTheme.colors.accent,
        )
        AppText(
            text = stringResource(Res.string.booking_reference_hint),
            modifier = Modifier.padding(bottom = spacing.space10),
            style = AppTheme.typography.bodySmall,
            color = AppTheme.colors.muted,
        )
        when {
            state.referenceUploading -> AppText(
                text = stringResource(Res.string.booking_reference_uploading),
                style = AppTheme.typography.bodyMedium,
                color = AppTheme.colors.muted,
            )
            image != null -> {
                AppLocalImage(
                    bytes = image.preview,
                    contentDescription = stringResource(Res.string.booking_reference_preview),
                    modifier = Modifier
                        .fillMaxWidth()
                        .height(BookingDesignConstants.referenceImageHeight)
                        .clip(AppTheme.shapes.medium),
                )
                AppTextButton(
                    text = stringResource(Res.string.booking_reference_remove),
                    onClick = { onAction(UiAction.OnReferenceRemove) },
                    modifier = Modifier.padding(top = spacing.space4),
                )
            }
            else -> AppOutlinedButton(
                text = stringResource(Res.string.booking_reference_add),
                onClick = { onAction(UiAction.OnReferencePick) },
                modifier = Modifier.fillMaxWidth(),
            )
        }
    }
}
