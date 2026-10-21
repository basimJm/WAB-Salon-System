package com.fab.wab.customer.feature.profile.presentation.screen

import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.defaultMinSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.Icon
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.semantics.Role
import androidx.compose.ui.text.font.FontWeight
import com.fab.wab.customer.designsystem.components.text.AppText
import com.fab.wab.customer.designsystem.icons.AppIcons
import com.fab.wab.customer.designsystem.theme.AppTheme
import com.fab.wab.customer.designsystem.utils.brandBackground
import com.fab.wab.customer.designsystem.utils.brandBrush
import com.fab.wab.customer.designsystem.utils.softShadow

/** S21 section: 12/700 faint title (`margin:0 4px 8px`) over a bordered 18 px card of rows. */
@Composable
internal fun ProfileSection(title: String, modifier: Modifier = Modifier, content: @Composable () -> Unit) {
    val colors = AppTheme.colors
    val shape = RoundedCornerShape(ProfileDesign.sectionRadius)
    Column(modifier = modifier.fillMaxWidth()) {
        AppText(
            text = title,
            style = AppTheme.typography.labelMedium.copy(fontSize = ProfileDesign.sectionTitleSize, fontWeight = FontWeight.Bold),
            color = colors.faint,
            modifier = Modifier
                .padding(horizontal = ProfileDesign.sectionTitleHorizontal)
                .padding(bottom = ProfileDesign.sectionTitleBottom),
        )
        Column(
            modifier = Modifier
                .fillMaxWidth()
                .clip(shape)
                .background(colors.card)
                .border(AppTheme.sizes.hairline, colors.line, shape),
        ) { content() }
    }
}

/**
 * Row (`min-height:54px;padding:0 14px;gap:12px`): 34 px soft icon box, 14 px label, optional 12.5 muted value,
 * then a 15 px faint chevron (mirrored in RTL) or the trailing slot (toggle).
 */
@Composable
internal fun ProfileRow(
    icon: ImageVector,
    label: String,
    modifier: Modifier = Modifier,
    value: String? = null,
    onClick: (() -> Unit)? = null,
    divider: Boolean = true,
    trailing: (@Composable () -> Unit)? = null,
) {
    val colors = AppTheme.colors
    Column(modifier = modifier.fillMaxWidth()) {
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .defaultMinSize(minHeight = ProfileDesign.rowMinHeight)
                .then(if (onClick != null) Modifier.clickable(role = Role.Button, onClick = onClick) else Modifier)
                .padding(horizontal = ProfileDesign.rowHorizontal),
            verticalAlignment = Alignment.CenterVertically,
            horizontalArrangement = Arrangement.spacedBy(AppTheme.spacing.space12),
        ) {
            Box(
                modifier = Modifier
                    .size(ProfileDesign.rowIconBox)
                    .background(colors.soft, RoundedCornerShape(ProfileDesign.rowIconBoxRadius)),
                contentAlignment = Alignment.Center,
            ) {
                Icon(icon, contentDescription = null, tint = colors.accent, modifier = Modifier.size(ProfileDesign.rowIcon))
            }
            AppText(text = label, style = AppTheme.typography.bodyMedium, modifier = Modifier.weight(1f))
            if (value != null) {
                AppText(
                    text = value,
                    style = AppTheme.typography.bodySmall.copy(fontSize = ProfileDesign.rowValueSize),
                    color = colors.muted,
                    maxLines = 1,
                )
            }
            when {
                trailing != null -> trailing()
                onClick != null -> Icon(
                    imageVector = AppIcons.Forward,
                    contentDescription = null,
                    tint = colors.faint,
                    modifier = Modifier.size(ProfileDesign.chevron),
                )
            }
        }
        if (divider) Box(Modifier.fillMaxWidth().height(AppTheme.sizes.hairline).background(colors.line))
    }
}

/** Design toggle: 44x26 track (gradient on, line off) with a 20 px white knob and a soft shadow. */
@Composable
internal fun ProfileToggle(checked: Boolean, onCheckedChange: (Boolean) -> Unit, modifier: Modifier = Modifier) {
    val colors = AppTheme.colors
    val track = if (checked) {
        Modifier.brandBackground(brandBrush(), AppTheme.shapes.pill)
    } else {
        Modifier.clip(AppTheme.shapes.pill).background(colors.line)
    }
    Box(
        modifier = modifier
            .size(width = ProfileDesign.toggleWidth, height = ProfileDesign.toggleHeight)
            .then(track)
            .clickable(role = Role.Switch) { onCheckedChange(!checked) }
            .padding(ProfileDesign.togglePadding),
        contentAlignment = if (checked) Alignment.CenterEnd else Alignment.CenterStart,
    ) {
        Box(
            modifier = Modifier
                .size(ProfileDesign.toggleKnob)
                .softShadow(
                    ProfileDesign.toggleKnobShadow,
                    colors.shadow.copy(alpha = ProfileDesign.toggleKnobShadowAlpha),
                    AppTheme.shapes.circle,
                )
                .background(colors.onGradient, AppTheme.shapes.circle),
        )
    }
}
