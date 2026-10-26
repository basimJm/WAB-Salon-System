package com.fab.wab.customer.designsystem.components.text

import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Column
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.saveable.rememberSaveable
import androidx.compose.runtime.setValue
import androidx.compose.ui.Modifier
import androidx.compose.ui.semantics.Role
import androidx.compose.ui.text.TextStyle
import androidx.compose.ui.text.style.TextOverflow
import com.fab.wab.customer.designsystem.resources.Res
import com.fab.wab.customer.designsystem.resources.card_more
import com.fab.wab.customer.designsystem.resources.card_see_less
import com.fab.wab.customer.designsystem.theme.AppTheme
import org.jetbrains.compose.resources.stringResource

/**
 * Long text truncated to [collapsedLines] with a "more" action that expands it in place (PRD §3.9).
 * The action only appears when the text actually overflows; [onExpandRequest] replaces in-place expansion
 * when a screen navigates instead (e.g. a review opening its sheet).
 */
@Composable
fun AppExpandableText(
    text: String,
    modifier: Modifier = Modifier,
    collapsedLines: Int = DEFAULT_COLLAPSED_LINES,
    style: TextStyle = AppTheme.typography.bodyMedium,
    moreLabel: String = stringResource(Res.string.card_more),
    lessLabel: String = stringResource(Res.string.card_see_less),
    onExpandRequest: (() -> Unit)? = null,
) {
    var expanded by rememberSaveable(text) { mutableStateOf(false) }
    var overflows by rememberSaveable(text) { mutableStateOf(false) }
    Column(modifier = modifier) {
        AppText(
            text = text,
            style = style,
            color = AppTheme.colors.muted,
            maxLines = if (expanded) Int.MAX_VALUE else collapsedLines,
            overflow = TextOverflow.Ellipsis,
            onTextLayout = { result -> if (!expanded) overflows = result.hasVisualOverflow },
        )
        if (expandToggleVisible(overflows = overflows, expanded = expanded)) {
            val toggle = onExpandRequest ?: { expanded = !expanded }
            AppText(
                text = if (expanded) lessLabel else moreLabel,
                style = AppTheme.typography.labelMedium,
                color = AppTheme.colors.accent,
                modifier = Modifier.clickable(role = Role.Button, onClick = toggle),
            )
        }
    }
}

private const val DEFAULT_COLLAPSED_LINES = 2

/** "more" only when the collapsed text really overflows; "less" while expanded (PRD §3.9). */
fun expandToggleVisible(overflows: Boolean, expanded: Boolean): Boolean = overflows || expanded
