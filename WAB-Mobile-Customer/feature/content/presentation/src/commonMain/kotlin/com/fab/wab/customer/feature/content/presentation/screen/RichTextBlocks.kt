package com.fab.wab.customer.feature.content.presentation.screen

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.AnnotatedString
import androidx.compose.ui.text.LinkAnnotation
import androidx.compose.ui.text.SpanStyle
import androidx.compose.ui.text.TextLinkStyles
import androidx.compose.ui.text.TextStyle
import androidx.compose.ui.text.buildAnnotatedString
import androidx.compose.ui.text.font.FontStyle
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextDecoration
import androidx.compose.ui.text.withLink
import androidx.compose.ui.text.withStyle
import com.fab.wab.customer.designsystem.components.text.AppText
import com.fab.wab.customer.designsystem.theme.AppTheme
import com.fab.wab.customer.feature.content.domain.model.RichBlock
import com.fab.wab.customer.feature.content.domain.model.RichSpan

private const val HEADING_LEVEL_1 = 1
private const val HEADING_LEVEL_2 = 2
private const val BULLET = "•"

/** Renders parsed server rich text with theme typography; links open through [onLinkClick]. */
@Composable
internal fun RichTextBlocks(blocks: List<RichBlock>, onLinkClick: (String) -> Unit, modifier: Modifier = Modifier) {
    val spacing = AppTheme.spacing
    Column(modifier = modifier.fillMaxWidth(), verticalArrangement = Arrangement.spacedBy(spacing.space12)) {
        blocks.forEach { block ->
            when (block) {
                is RichBlock.Heading -> AppText(text = block.spans.annotated(onLinkClick), style = headingStyle(block.level))
                is RichBlock.Paragraph -> AppText(text = block.spans.annotated(onLinkClick), style = AppTheme.typography.bodyMedium)
                is RichBlock.Bullet -> Row(horizontalArrangement = Arrangement.spacedBy(spacing.space8)) {
                    AppText(text = BULLET, style = AppTheme.typography.bodyMedium, color = AppTheme.colors.accent)
                    AppText(text = block.spans.annotated(onLinkClick), style = AppTheme.typography.bodyMedium)
                }
            }
        }
    }
}

@Composable
private fun headingStyle(level: Int): TextStyle = when (level) {
    HEADING_LEVEL_1 -> AppTheme.typography.headlineSmall
    HEADING_LEVEL_2 -> AppTheme.typography.titleLarge
    else -> AppTheme.typography.titleMedium
}

@Composable
private fun List<RichSpan>.annotated(onLinkClick: (String) -> Unit): AnnotatedString {
    val linkColor = AppTheme.colors.accent
    return buildAnnotatedString {
        forEach { span ->
            val style = SpanStyle(
                fontWeight = if (span.bold) FontWeight.Bold else null,
                fontStyle = if (span.italic) FontStyle.Italic else null,
            )
            val link = span.link
            if (link != null) {
                val linkStyles = TextLinkStyles(style = style.copy(color = linkColor, textDecoration = TextDecoration.Underline))
                withLink(
                    LinkAnnotation.Clickable(tag = link, styles = linkStyles, linkInteractionListener = { onLinkClick(link) }),
                ) { append(span.text) }
            } else {
                withStyle(style) { append(span.text) }
            }
        }
    }
}
