package com.fab.wab.customer.designsystem.components.text

import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.semantics.contentDescription
import androidx.compose.ui.semantics.semantics
import androidx.compose.ui.text.TextStyle
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.text.style.TextOverflow
import com.fab.wab.customer.designsystem.theme.LocalAppColors
import com.fab.wab.customer.designsystem.theme.LocalTypography

@Composable
fun AppText(
    text: String,
    modifier: Modifier = Modifier,
    color: Color = LocalAppColors.current.onBackground,
    style: TextStyle = LocalTypography.current.bodyMedium,
    textAlign: TextAlign? = null,
    maxLines: Int = Int.MAX_VALUE,
    overflow: TextOverflow = TextOverflow.Ellipsis,
    contentDescription: String? = null,
) {
    val semanticsModifier = if (contentDescription != null) {
        Modifier.semantics { this.contentDescription = contentDescription }
    } else {
        Modifier
    }

    Text(
        text = text,
        modifier = modifier.then(semanticsModifier),
        color = color,
        style = style,
        textAlign = textAlign,
        maxLines = maxLines,
        overflow = overflow,
    )
}

object AppTextStyles {
    @Composable
    fun headlineLarge(text: String, modifier: Modifier = Modifier, color: Color = LocalAppColors.current.onBackground) =
        AppText(text, modifier, color, LocalTypography.current.headlineLarge)

    @Composable
    fun headlineMedium(text: String, modifier: Modifier = Modifier, color: Color = LocalAppColors.current.onBackground) =
        AppText(text, modifier, color, LocalTypography.current.headlineMedium)

    @Composable
    fun headlineSmall(text: String, modifier: Modifier = Modifier, color: Color = LocalAppColors.current.onBackground) =
        AppText(text, modifier, color, LocalTypography.current.headlineSmall)

    @Composable
    fun titleLarge(text: String, modifier: Modifier = Modifier, color: Color = LocalAppColors.current.onBackground) =
        AppText(text, modifier, color, LocalTypography.current.titleLarge)

    @Composable
    fun titleMedium(text: String, modifier: Modifier = Modifier, color: Color = LocalAppColors.current.onBackground) =
        AppText(text, modifier, color, LocalTypography.current.titleMedium)

    @Composable
    fun titleSmall(text: String, modifier: Modifier = Modifier, color: Color = LocalAppColors.current.onBackground) =
        AppText(text, modifier, color, LocalTypography.current.titleSmall)

    @Composable
    fun bodyLarge(text: String, modifier: Modifier = Modifier, color: Color = LocalAppColors.current.onBackground) =
        AppText(text, modifier, color, LocalTypography.current.bodyLarge)

    @Composable
    fun bodyMedium(text: String, modifier: Modifier = Modifier, color: Color = LocalAppColors.current.onBackground) =
        AppText(text, modifier, color, LocalTypography.current.bodyMedium)

    @Composable
    fun bodySmall(text: String, modifier: Modifier = Modifier, color: Color = LocalAppColors.current.onBackground) =
        AppText(text, modifier, color, LocalTypography.current.bodySmall)

    @Composable
    fun labelLarge(text: String, modifier: Modifier = Modifier, color: Color = LocalAppColors.current.onBackground) =
        AppText(text, modifier, color, LocalTypography.current.labelLarge)

    @Composable
    fun labelMedium(text: String, modifier: Modifier = Modifier, color: Color = LocalAppColors.current.onBackground) =
        AppText(text, modifier, color, LocalTypography.current.labelMedium)

    @Composable
    fun labelSmall(text: String, modifier: Modifier = Modifier, color: Color = LocalAppColors.current.onBackground) =
        AppText(text, modifier, color, LocalTypography.current.labelSmall)

    @Composable
    fun sectionLabel(text: String, modifier: Modifier = Modifier, color: Color = LocalAppColors.current.onSurfaceVariant) =
        AppText(text, modifier, color, LocalTypography.current.sectionLabel)
}
