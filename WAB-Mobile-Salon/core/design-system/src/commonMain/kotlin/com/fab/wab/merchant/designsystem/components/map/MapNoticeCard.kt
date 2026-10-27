package com.fab.wab.merchant.designsystem.components.map

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.material3.Icon
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import com.fab.wab.merchant.designsystem.components.button.AppTextButton
import com.fab.wab.merchant.designsystem.components.surface.cardBackground
import com.fab.wab.merchant.designsystem.components.text.AppText
import com.fab.wab.merchant.designsystem.icons.AppIcons
import com.fab.wab.merchant.designsystem.resources.Res
import com.fab.wab.merchant.designsystem.resources.map_notice_blocked
import com.fab.wab.merchant.designsystem.resources.map_notice_denied
import com.fab.wab.merchant.designsystem.resources.map_notice_dismiss
import com.fab.wab.merchant.designsystem.resources.map_notice_not_found
import com.fab.wab.merchant.designsystem.resources.map_notice_open_settings
import com.fab.wab.merchant.designsystem.resources.map_notice_services_off
import com.fab.wab.merchant.designsystem.resources.map_notice_try_again
import com.fab.wab.merchant.designsystem.theme.AppTheme
import com.fab.wab.merchant.designsystem.theme.SurfaceTone
import org.jetbrains.compose.resources.StringResource
import org.jetbrains.compose.resources.stringResource

/** Why "Use my location" did not move the map, with its way out (try again, settings, location switch). */
@Composable
internal fun MapNoticeCard(notice: MapNotice, onAction: (MapPickerAction) -> Unit, modifier: Modifier = Modifier) {
    val spacing = AppTheme.spacing
    val shape = AppTheme.shapes.medium
    Column(
        modifier = modifier
            .fillMaxWidth()
            .cardBackground(AppTheme.surfaces, shape, SurfaceTone.Card, stateBorder = AppTheme.colors.warning)
            .padding(horizontal = spacing.space14, vertical = spacing.space10),
        verticalArrangement = Arrangement.spacedBy(spacing.space6),
    ) {
        Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(spacing.space8)) {
            Icon(
                imageVector = AppIcons.LocationOff,
                contentDescription = null,
                tint = AppTheme.colors.warning,
                modifier = Modifier.size(AppTheme.sizes.iconSmall),
            )
            AppText(text = stringResource(notice.message()), style = AppTheme.typography.bodySmall, modifier = Modifier.weight(1f))
        }
        Row(modifier = Modifier.align(Alignment.End), horizontalArrangement = Arrangement.spacedBy(spacing.space4)) {
            AppTextButton(text = stringResource(Res.string.map_notice_dismiss), onClick = { onAction(MapPickerAction.DismissNotice) })
            notice.actionLabel()?.let { label ->
                AppTextButton(text = stringResource(label), onClick = { onAction(MapPickerAction.NoticeAction) })
            }
        }
    }
}

private fun MapNotice.message(): StringResource = when (this) {
    MapNotice.DENIED -> Res.string.map_notice_denied
    MapNotice.BLOCKED -> Res.string.map_notice_blocked
    MapNotice.SERVICES_OFF -> Res.string.map_notice_services_off
    MapNotice.NOT_FOUND -> Res.string.map_notice_not_found
}

private fun MapNotice.actionLabel(): StringResource? = when (this) {
    MapNotice.DENIED -> Res.string.map_notice_try_again
    MapNotice.BLOCKED, MapNotice.SERVICES_OFF -> Res.string.map_notice_open_settings
    MapNotice.NOT_FOUND -> null
}
