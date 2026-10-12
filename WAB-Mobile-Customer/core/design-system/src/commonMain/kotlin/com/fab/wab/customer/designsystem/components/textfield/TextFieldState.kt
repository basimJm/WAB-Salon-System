package com.fab.wab.customer.designsystem.components.textfield

import androidx.compose.ui.focus.FocusRequester
import androidx.compose.ui.text.input.TextFieldValue
import org.jetbrains.compose.resources.StringResource

/**
 * State holder for text field components following Stitch design system.
 *
 * @param hint The label/hint text displayed above or within the field
 * @param placeholder Optional placeholder text when field is empty
 * @param textFieldValue Current text value and selection
 * @param errorId Optional error message
 * @param length Maximum character length allowed
 * @param isHintVisible Whether to show the hint label
 * @param isEnabled Whether the field is interactive
 * @param leading Optional leading prefix text (e.g., "+962" for phone)
 * @param focusRequester Optional focus requester for programmatic focus
 */
data class TextFieldState(
    val hint: StringResource,
    val placeholder: StringResource? = null,
    val textFieldValue: TextFieldValue = TextFieldValue(text = ""),
    val errorId: StringResource? = null,
    val stringError: String? = null,
    val length: Int = Int.MAX_VALUE,
    val isHintVisible: Boolean = true,
    val isEnabled: Boolean = true,
    val leading: Int? = null,
    val focusRequester: FocusRequester? = null,
)
