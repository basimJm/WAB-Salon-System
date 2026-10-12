package com.fab.wab.customer.designsystem.components.feedback

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.material3.Icon
import androidx.compose.material3.MaterialTheme
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import com.fab.wab.customer.designsystem.components.text.AppText
import com.fab.wab.customer.designsystem.components.text.AppTextStyles
import com.fab.wab.customer.designsystem.theme.DefaultSpacingTokens
import com.fab.wab.customer.designsystem.theme.LocalAppColors

@Composable
fun AppEmptyState(
    modifier: Modifier = Modifier,
    icon: ImageVector? = null,
    title: String = "No data",
    message: String = "There is nothing to display.",
    action: (@Composable () -> Unit)? = null,
) {
    val colors = LocalAppColors.current
    
    Column(
        modifier = modifier
            .fillMaxSize()
            .padding(DefaultSpacingTokens.space24),
        horizontalAlignment = Alignment.CenterHorizontally,
        verticalArrangement = Arrangement.Center,
    ) {
        if (icon != null) {
            Icon(
                imageVector = icon,
                contentDescription = null,
                modifier = Modifier.size(64.dp),
                tint = colors.onSurfaceVariant,
            )
            Spacer(modifier = Modifier.height(DefaultSpacingTokens.space16))
        }
        AppTextStyles.titleMedium(
            text = title,
            color = colors.onSurface,
        )
        Spacer(modifier = Modifier.height(DefaultSpacingTokens.space8))
        AppText(
            text = message,
            color = colors.onSurfaceVariant,
            style = MaterialTheme.typography.bodyMedium,
            textAlign = TextAlign.Center,
        )
        if (action != null) {
            Spacer(modifier = Modifier.height(DefaultSpacingTokens.space24))
            action()
        }
    }
}
