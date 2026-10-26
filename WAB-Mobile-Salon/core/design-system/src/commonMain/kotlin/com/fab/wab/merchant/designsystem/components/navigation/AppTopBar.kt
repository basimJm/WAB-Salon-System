package com.fab.wab.merchant.designsystem.components.navigation

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.RowScope
import androidx.compose.foundation.layout.WindowInsets
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.statusBars
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.layout.widthIn
import androidx.compose.foundation.layout.windowInsetsPadding
import androidx.compose.material3.Icon
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.semantics.contentDescription
import androidx.compose.ui.semantics.semantics
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import com.fab.wab.merchant.designsystem.components.surface.appClickable
import com.fab.wab.merchant.designsystem.components.text.AppText
import com.fab.wab.merchant.designsystem.icons.AppIcons
import com.fab.wab.merchant.designsystem.resources.Res
import com.fab.wab.merchant.designsystem.resources.common_back
import com.fab.wab.merchant.designsystem.theme.AppTheme
import org.jetbrains.compose.resources.stringResource

/**
 * The design's top bar (`height:50px;padding:0 10px`): a plain 22 dp back chevron at Start (no background, mirrors in
 * RTL), centered 16/700 title, actions at End, on the screen background. Respects the status bar and cutouts.
 */
@Composable
fun AppTopBar(
    title: String,
    modifier: Modifier = Modifier,
    onBack: (() -> Unit)? = null,
    actions: @Composable RowScope.() -> Unit = {},
) {
    Row(
        modifier = modifier
            .fillMaxWidth()
            .windowInsetsPadding(WindowInsets.statusBars)
            .height(AppTheme.sizes.topBarHeight)
            .padding(horizontal = AppTheme.spacing.space10),
        verticalAlignment = Alignment.CenterVertically,
    ) {
        Box(Modifier.width(AppTheme.sizes.touchTarget), contentAlignment = Alignment.Center) {
            if (onBack != null) {
                val description = stringResource(Res.string.common_back)
                Box(
                    modifier = Modifier
                        .size(AppTheme.sizes.touchTarget)
                        .clip(AppTheme.shapes.circle)
                        .appClickable(onClick = onBack)
                        .semantics { contentDescription = description },
                    contentAlignment = Alignment.Center,
                ) {
                    Icon(
                        imageVector = AppIcons.Back,
                        contentDescription = null,
                        tint = AppTheme.colors.ink,
                        modifier = Modifier.size(AppTheme.sizes.tabIcon),
                    )
                }
            }
        }
        AppText(
            text = title,
            style = AppTheme.typography.titleMedium.copy(fontWeight = FontWeight.Bold),
            textAlign = TextAlign.Center,
            maxLines = 1,
            modifier = Modifier.weight(1f),
        )
        Row(
            modifier = Modifier.widthIn(min = AppTheme.sizes.touchTarget),
            horizontalArrangement = Arrangement.End,
            verticalAlignment = Alignment.CenterVertically,
            content = actions,
        )
    }
}
