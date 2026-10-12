package com.fab.wab.customer.designsystem.components.textfield

import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.heightIn
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.text.KeyboardActions
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.text.input.ImeAction
import androidx.compose.ui.unit.dp
import com.fab.wab.customer.core.domain.model.PlacePrediction
import com.fab.wab.customer.designsystem.components.spacer.AppSpacerVertical
import com.fab.wab.customer.designsystem.components.text.AppTextStyles
import com.fab.wab.customer.designsystem.theme.LocalAppColors
import com.fab.wab.customer.designsystem.theme.LocalSpacing

/**
 * Search text field with dropdown results for Google Places autocomplete.
 *
 * @param state Text field state containing hint, placeholder, and current value
 * @param searchQuery Current search query string
 * @param onSearchQueryChange Callback when search query changes
 * @param predictions List of place predictions to display
 * @param onPlaceSelected Callback when a place is selected from the list
 * @param isLoading Whether search is in progress
 * @param modifier Modifier for the component
 */
@Composable
fun AppSearchTextField(
    state: TextFieldState,
    searchQuery: String,
    onSearchQueryChange: (String) -> Unit,
    predictions: List<PlacePrediction>,
    onPlaceSelected: (PlacePrediction) -> Unit,
    isLoading: Boolean = false,
    modifier: Modifier = Modifier,
) {
    val colors = LocalAppColors.current
    val spacing = LocalSpacing.current

    Column(modifier = modifier.fillMaxWidth()) {
        AppBaseTextField(
            state = state.copy(
                textFieldValue = state.textFieldValue.copy(text = searchQuery)
            ),
            onValueChange = onSearchQueryChange,
            modifier = Modifier.fillMaxWidth(),
            keyboardOptions = KeyboardOptions(
                imeAction = ImeAction.Search
            ),
            keyboardActions = KeyboardActions(
                onSearch = { /* Search triggered */ }
            ),
        )

        // Show predictions dropdown when there are results and user is typing
        if (predictions.isNotEmpty() && searchQuery.isNotBlank()) {
            AppSpacerVertical(size = spacing.space8)

            LazyColumn(
                modifier = Modifier
                    .fillMaxWidth()
                    .heightIn(max = 240.dp)
                    .clip(RoundedCornerShape(spacing.space12))
                    .background(colors.surfaceContainer)
                    .padding(vertical = spacing.space8)
            ) {
                items(
                    items = predictions,
                    key = { it.placeId }
                ) { prediction ->
                    PlacePredictionItem(
                        prediction = prediction,
                        onClick = { onPlaceSelected(prediction) }
                    )
                }
            }
        }
    }
}

@Composable
private fun PlacePredictionItem(
    prediction: PlacePrediction,
    onClick: () -> Unit,
) {
    val colors = LocalAppColors.current
    val spacing = LocalSpacing.current

    Column(
        modifier = Modifier
            .fillMaxWidth()
            .clickable(onClick = onClick)
            .padding(
                horizontal = spacing.space16,
                vertical = spacing.space12
            )
    ) {
        AppTextStyles.bodyMedium(
            text = prediction.primaryText,
            color = colors.onSurface,
        )

        AppSpacerVertical(size = spacing.space4)

        AppTextStyles.bodySmall(
            text = prediction.secondaryText,
            color = colors.onSurfaceVariant,
        )
    }
}