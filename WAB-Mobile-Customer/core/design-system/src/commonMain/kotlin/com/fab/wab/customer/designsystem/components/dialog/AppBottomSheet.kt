package com.fab.wab.customer.designsystem.components.dialog

import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.ColumnScope
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.ModalBottomSheet
import androidx.compose.material3.SheetState
import androidx.compose.material3.SheetValue
import androidx.compose.material3.Text
import androidx.compose.material3.rememberModalBottomSheetState
import androidx.compose.runtime.Composable
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.Shape
import com.fab.wab.customer.designsystem.theme.LocalAppColors
import com.fab.wab.customer.designsystem.theme.LocalShapes
import com.fab.wab.customer.designsystem.theme.LocalSpacing
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.launch

/**
 * State for [AppBottomSheet].
 * Wraps [SheetState] to provide a cleaner API for showing and hiding.
 */
@OptIn(ExperimentalMaterial3Api::class)
class AppBottomSheetState(
    val sheetState: SheetState,
    private val coroutineScope: CoroutineScope,
) {
    /**
     * Shows the bottom sheet.
     */
    fun show() {
        coroutineScope.launch {
            sheetState.show()
        }
    }

    /**
     * Hides the bottom sheet.
     * @param onHidden Optional callback called after the sheet is hidden.
     */
    fun hide(onHidden: () -> Unit = {}) {
        coroutineScope.launch {
            sheetState.hide()
        }.invokeOnCompletion {
            if (!sheetState.isVisible) {
                onHidden()
            }
        }
    }

    /**
     * Whether the bottom sheet is currently visible.
     */
    val isVisible: Boolean
        get() = sheetState.isVisible
}

/**
 * Creates and remembers an [AppBottomSheetState].
 *
 * @param skipPartiallyExpanded Whether the partially expanded state, if the sheet is large
 * enough, should be skipped. If true, the sheet will always expand to [SheetValue.Expanded].
 * @param confirmValueChange Optional callback to confirm or veto a pending state change.
 */
@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun rememberAppBottomSheetState(
    skipPartiallyExpanded: Boolean = false,
    confirmValueChange: (SheetValue) -> Boolean = { true },
): AppBottomSheetState {
    val sheetState = rememberModalBottomSheetState(
        skipPartiallyExpanded = skipPartiallyExpanded,
        confirmValueChange = confirmValueChange
    )
    val coroutineScope = rememberCoroutineScope()
    return remember(sheetState, coroutineScope) {
        AppBottomSheetState(sheetState, coroutineScope)
    }
}

/**
 * A dynamic and scalable bottom sheet that follows the WABCustomer design system.
 *
 * @param onDismissRequest Called when the user dismisses the bottom sheet (e.g., by tapping the scrim).
 * @param modifier The modifier to be applied to the bottom sheet.
 * @param state The state of the bottom sheet.
 * @param title Optional title to display at the top of the content.
 * @param subtitle Optional subtitle to display below the title.
 * @param shape The shape of the bottom sheet. Defaults to extraLarge from the design system.
 * @param containerColor The color used for the background of this bottom sheet.
 * @param contentColor The preferred color for content inside this bottom sheet.
 * @param scrimColor The color of the scrim that obscures content when the bottom sheet is open.
 * @param dragHandle Optional visual marker to indicate that the bottom sheet can be dragged.
 * @param content The content of the bottom sheet.
 */
@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun AppBottomSheet(
    onDismissRequest: () -> Unit,
    modifier: Modifier = Modifier,
    state: AppBottomSheetState = rememberAppBottomSheetState(),
    title: String? = null,
    subtitle: String? = null,
    shape: Shape = LocalShapes.current.extraLarge,
    containerColor: Color = LocalAppColors.current.surfaceContainerLow,
    contentColor: Color = LocalAppColors.current.onSurface,
    scrimColor: Color = LocalAppColors.current.scrim.copy(alpha = 0.32f),
    dragHandle: @Composable (() -> Unit)? = null,
    content: @Composable ColumnScope.() -> Unit
) {
    ModalBottomSheet(
        onDismissRequest = onDismissRequest,
        modifier = modifier,
        sheetState = state.sheetState,
        shape = shape,
        containerColor = containerColor,
        contentColor = contentColor,
        scrimColor = scrimColor,
        dragHandle = dragHandle,
    ) {
        Column(
            modifier = Modifier
                .fillMaxWidth()
                .padding(bottom = LocalSpacing.current.space32) // Extra space for navigation bar/padding
        ) {
            if (title != null || subtitle != null) {
                Column(
                    modifier = Modifier
                        .padding(horizontal = LocalSpacing.current.space24)
                        .padding(bottom = LocalSpacing.current.space16)
                ) {
                    if (title != null) {
                        Text(
                            text = title,
                            style = MaterialTheme.typography.titleLarge,
                            color = LocalAppColors.current.onSurface
                        )
                    }
                    if (subtitle != null) {
                        if (title != null) Spacer(modifier = Modifier.height(LocalSpacing.current.space4))
                        Text(
                            text = subtitle,
                            style = MaterialTheme.typography.bodyMedium,
                            color = LocalAppColors.current.onSurfaceVariant
                        )
                    }
                }
            }
            content()
        }
    }
}
