package com.fab.wab.merchant.designsystem.components.dashboard

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.font.FontWeight
import com.fab.wab.merchant.designsystem.components.button.AppButton
import com.fab.wab.merchant.designsystem.components.button.ButtonKind
import com.fab.wab.merchant.designsystem.components.text.AppText
import com.fab.wab.merchant.designsystem.resources.Res
import com.fab.wab.merchant.designsystem.resources.offline_banner_contact
import com.fab.wab.merchant.designsystem.resources.offline_banner_message
import com.fab.wab.merchant.designsystem.theme.AppTheme
import org.jetbrains.compose.resources.stringResource

/** PRD §3 offline salon banner (design: rose tint, dot, message, Contact); persistent on every screen while OFFLINE. */
@Composable
fun AppOfflineSalonBanner(onContact: () -> Unit, modifier: Modifier = Modifier) {
    val colors = AppTheme.colors
    val spacing = AppTheme.spacing
    Row(
        modifier = modifier
            .fillMaxWidth()
            .padding(horizontal = spacing.space14, vertical = spacing.space4)
            .background(colors.dangerContainer, AppTheme.shapes.medium)
            .padding(start = spacing.space12),
        horizontalArrangement = Arrangement.spacedBy(spacing.space8),
        verticalAlignment = Alignment.CenterVertically,
    ) {
        Box(Modifier.size(AppTheme.sizes.statusDot).background(colors.danger, AppTheme.shapes.circle))
        AppText(
            text = stringResource(Res.string.offline_banner_message),
            style = AppTheme.typography.bodySmall.copy(fontWeight = FontWeight.Medium),
            modifier = Modifier.weight(1f),
        )
        AppButton(text = stringResource(Res.string.offline_banner_contact), onClick = onContact, kind = ButtonKind.Text)
    }
}
