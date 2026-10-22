package com.fab.wab.customer.feature.auth.presentation.screen

import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxHeight
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.text.BasicTextField
import androidx.compose.material3.Icon
import androidx.compose.runtime.Composable
import androidx.compose.runtime.CompositionLocalProvider
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.alpha
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.SolidColor
import androidx.compose.ui.platform.LocalLayoutDirection
import androidx.compose.ui.semantics.Role
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextDirection
import androidx.compose.ui.unit.LayoutDirection
import com.fab.wab.customer.designsystem.components.form.AppKeyboards
import com.fab.wab.customer.designsystem.components.form.CountryUi
import com.fab.wab.customer.designsystem.components.glass.glassBackground
import com.fab.wab.customer.designsystem.components.image.AppImage
import com.fab.wab.customer.designsystem.components.text.AppText
import com.fab.wab.customer.designsystem.icons.AppIcons
import com.fab.wab.customer.designsystem.resources.Res as CoreRes
import com.fab.wab.customer.designsystem.resources.country_change_description
import com.fab.wab.customer.designsystem.theme.AppTheme
import org.jetbrains.compose.resources.stringResource

/**
 * The design's phone field (`fs.phone` / `fs.rphone`): one 52 dp bordered box (radius 14, 1.5 dp line / danger) in
 * LTR, with the country button (flag 18, dial 14/600, optional 12 dp chevron, `padding:0 12px`) separated from the
 * digits by a 1 dp vertical line. `AppPhoneField` pads the chip inside the input and has no divider, so this stays
 * private here. Candidate for the design system.
 */
@Composable
internal fun AuthPhoneField(
    value: String,
    onValueChange: (String) -> Unit,
    country: CountryUi?,
    onCountryClick: () -> Unit,
    placeholder: String,
    modifier: Modifier = Modifier,
    error: Boolean = false,
    enabled: Boolean = true,
    showChevron: Boolean = true,
) {
    val colors = AppTheme.colors
    val shape = AppTheme.shapes.medium
    val textStyle = AppTheme.typography.bodyLarge.copy(
        fontSize = AuthDesign.fieldTextSize,
        letterSpacing = AuthDesign.fieldLetterSpacing,
        color = colors.ink,
        textDirection = TextDirection.Ltr,
    )
    CompositionLocalProvider(LocalLayoutDirection provides LayoutDirection.Ltr) {
        Row(
            modifier = modifier
                .fillMaxWidth()
                .height(AppTheme.sizes.fieldHeight)
                .alpha(if (enabled) 1f else AppTheme.alpha.disabled)
                .clip(shape)
                .glassBackground(AppTheme.glass, shape, stateBorder = if (error) colors.danger else Color.Unspecified),
            verticalAlignment = Alignment.CenterVertically,
        ) {
            CountryPrefix(country, onCountryClick, enabled, showChevron)
            Spacer(Modifier.width(AppTheme.sizes.hairline).fillMaxHeight().background(colors.line))
            BasicTextField(
                value = value,
                onValueChange = { onValueChange(it.filter(Char::isDigit)) },
                modifier = Modifier.weight(1f).padding(horizontal = AuthDesign.phoneTextPadding),
                enabled = enabled,
                singleLine = true,
                textStyle = textStyle,
                keyboardOptions = AppKeyboards.phone,
                cursorBrush = SolidColor(colors.accent),
                decorationBox = { inner ->
                    Box(contentAlignment = Alignment.CenterStart) {
                        if (value.isEmpty()) {
                            AppText(text = placeholder, style = textStyle, color = colors.faint, maxLines = 1)
                        }
                        inner()
                    }
                },
            )
        }
    }
}

@Composable
private fun CountryPrefix(
    country: CountryUi?,
    onClick: () -> Unit,
    enabled: Boolean,
    showChevron: Boolean,
    modifier: Modifier = Modifier,
) {
    val description = stringResource(CoreRes.string.country_change_description)
    Row(
        modifier = modifier
            .fillMaxHeight()
            .clickable(enabled = enabled, role = Role.Button, onClickLabel = description, onClick = onClick)
            .padding(horizontal = AuthDesign.phonePrefixPadding),
        horizontalArrangement = Arrangement.spacedBy(AppTheme.spacing.space6),
        verticalAlignment = Alignment.CenterVertically,
    ) {
        val flag = country?.flagUrl
        if (flag != null) {
            AppImage(url = flag, modifier = Modifier.size(AuthDesign.phoneFlag).clip(AppTheme.shapes.extraSmall))
        }
        AppText(
            text = country?.dialCode.orEmpty(),
            style = AppTheme.typography.labelMedium.copy(fontSize = AuthDesign.phoneDialSize, fontWeight = FontWeight.SemiBold),
            maxLines = 1,
        )
        if (showChevron) {
            Icon(
                imageVector = AppIcons.ExpandMore,
                contentDescription = null,
                tint = AppTheme.colors.ink,
                modifier = Modifier.size(AuthDesign.phoneChevron),
            )
        }
    }
}
