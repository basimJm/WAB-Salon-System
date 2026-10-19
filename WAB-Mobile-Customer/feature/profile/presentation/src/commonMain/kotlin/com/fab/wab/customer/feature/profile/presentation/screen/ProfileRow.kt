package com.fab.wab.customer.feature.profile.presentation.screen

import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.heightIn
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.material3.Icon
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.vector.ImageVector
import com.fab.wab.customer.designsystem.components.card.AppCard
import com.fab.wab.customer.designsystem.components.divider.AppDivider
import com.fab.wab.customer.designsystem.components.section.AppSectionHeader
import com.fab.wab.customer.designsystem.components.text.AppText
import com.fab.wab.customer.designsystem.icons.AppIcons
import com.fab.wab.customer.designsystem.theme.AppTheme

/** A titled card of rows (Design Script S21 sections). */
@Composable
internal fun ProfileSection(title: String, modifier: Modifier = Modifier, content: @Composable () -> Unit) {
    Column(modifier = modifier.fillMaxWidth(), verticalArrangement = Arrangement.spacedBy(AppTheme.spacing.space8)) {
        AppSectionHeader(title = title)
        AppCard(modifier = Modifier.fillMaxWidth()) { Column { content() } }
    }
}

/** Icon + label (+ value) with a trailing chevron or a custom trailing slot (switch). */
@Composable
internal fun ProfileRow(
    icon: ImageVector,
    label: String,
    modifier: Modifier = Modifier,
    value: String? = null,
    onClick: (() -> Unit)? = null,
    danger: Boolean = false,
    divider: Boolean = true,
    trailing: (@Composable () -> Unit)? = null,
) {
    val colors = AppTheme.colors
    val spacing = AppTheme.spacing
    val tint = if (danger) colors.danger else colors.accent
    Column {
        Row(
            modifier = modifier
                .fillMaxWidth()
                .heightIn(min = AppTheme.sizes.touchTarget)
                .then(if (onClick != null) Modifier.clickable(onClick = onClick) else Modifier)
                .padding(horizontal = spacing.space16, vertical = spacing.space8),
            verticalAlignment = Alignment.CenterVertically,
            horizontalArrangement = Arrangement.spacedBy(spacing.space12),
        ) {
            Icon(icon, contentDescription = null, tint = tint, modifier = Modifier.size(AppTheme.sizes.iconLarge))
            AppText(text = label, modifier = Modifier.weight(1f), color = if (danger) colors.danger else colors.ink)
            if (value != null) AppText(text = value, style = AppTheme.typography.bodySmall, color = colors.muted)
            when {
                trailing != null -> trailing()
                onClick != null -> Icon(AppIcons.Forward, contentDescription = null, tint = colors.muted, modifier = Modifier.size(AppTheme.sizes.iconSmall))
            }
        }
        if (divider) AppDivider()
    }
}
