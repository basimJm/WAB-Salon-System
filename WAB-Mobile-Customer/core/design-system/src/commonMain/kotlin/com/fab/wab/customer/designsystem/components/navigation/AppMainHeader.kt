package com.fab.wab.customer.designsystem.components.navigation

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.size
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import com.fab.wab.customer.designsystem.components.text.AppTextStyles
import com.fab.wab.customer.designsystem.icons.AppIcons
import com.fab.wab.customer.designsystem.theme.LocalAppColors
import com.fab.wab.customer.designsystem.theme.LocalSpacing

@Composable
fun AppMainHeader(
    title: String,
    modifier: Modifier = Modifier,
    subtitle: String? = null,
    onNotificationClick: () -> Unit,
) {
    val colors = LocalAppColors.current
    val spacing = LocalSpacing.current

    Row(
        modifier = modifier.fillMaxWidth(),
        horizontalArrangement = Arrangement.SpaceBetween,
        verticalAlignment = Alignment.CenterVertically,
    ) {
        Column(modifier = Modifier.weight(1f)) {
            AppTextStyles.headlineMedium(
                text = title,
                color = colors.onSurface,
            )
            if (subtitle != null) {
                AppTextStyles.bodySmall(
                    text = subtitle,
                    color = colors.onSurfaceVariant,
                )
            }
        }

        IconButton(onClick = onNotificationClick) {
            Icon(
                imageVector = AppIcons.Notifications,
                contentDescription = null,
                tint = colors.primary,
                modifier = Modifier.size(spacing.space24),
            )
        }
    }
}
