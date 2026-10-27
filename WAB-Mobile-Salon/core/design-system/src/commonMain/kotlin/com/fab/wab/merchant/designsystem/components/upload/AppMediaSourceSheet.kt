package com.fab.wab.merchant.designsystem.components.upload

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.vector.ImageVector
import com.fab.wab.merchant.core.ui.media.MediaSource
import com.fab.wab.merchant.designsystem.components.badge.StatusTone
import com.fab.wab.merchant.designsystem.components.button.AppButton
import com.fab.wab.merchant.designsystem.components.button.ButtonKind
import com.fab.wab.merchant.designsystem.components.dialog.AppBottomSheet
import com.fab.wab.merchant.designsystem.components.dialog.AppDialog
import com.fab.wab.merchant.designsystem.components.text.AppText
import com.fab.wab.merchant.designsystem.icons.AppIcons
import com.fab.wab.merchant.designsystem.resources.Res
import com.fab.wab.merchant.designsystem.resources.media_camera_blocked_message
import com.fab.wab.merchant.designsystem.resources.media_camera_blocked_title
import com.fab.wab.merchant.designsystem.resources.media_camera_unavailable_message
import com.fab.wab.merchant.designsystem.resources.media_camera_unavailable_title
import com.fab.wab.merchant.designsystem.resources.media_ok
import com.fab.wab.merchant.designsystem.resources.media_open_settings
import com.fab.wab.merchant.designsystem.resources.media_source_camera
import com.fab.wab.merchant.designsystem.resources.media_source_camera_unavailable
import com.fab.wab.merchant.designsystem.resources.media_source_files
import com.fab.wab.merchant.designsystem.resources.media_source_library
import com.fab.wab.merchant.designsystem.resources.media_source_title
import com.fab.wab.merchant.designsystem.resources.upload_cancel
import com.fab.wab.merchant.designsystem.theme.AppTheme
import org.jetbrains.compose.resources.StringResource
import org.jetbrains.compose.resources.stringResource

/**
 * Everything a picking screen draws for [MediaPickHandler]: the source sheet (camera / photo library / files, the
 * camera row disabled with its reason on a device without one) and the camera notices (blocked → settings).
 */
@Composable
fun AppMediaPicker(state: MediaPickUi, onAction: (MediaPickAction) -> Unit) {
    if (state.isChoosing) AppMediaSourceSheet(state, onAction)
    when (state.notice) {
        MediaNotice.CAMERA_BLOCKED -> AppDialog(
            title = stringResource(Res.string.media_camera_blocked_title),
            message = stringResource(Res.string.media_camera_blocked_message),
            confirmText = stringResource(Res.string.media_open_settings),
            dismissText = stringResource(Res.string.upload_cancel),
            onConfirm = { onAction(MediaPickAction.OpenSettings) },
            onDismiss = { onAction(MediaPickAction.DismissNotice) },
            icon = AppIcons.Camera,
            tone = StatusTone.Warning,
        )
        MediaNotice.CAMERA_UNAVAILABLE -> AppDialog(
            title = stringResource(Res.string.media_camera_unavailable_title),
            message = stringResource(Res.string.media_camera_unavailable_message),
            confirmText = stringResource(Res.string.media_ok),
            onConfirm = { onAction(MediaPickAction.DismissNotice) },
            onDismiss = { onAction(MediaPickAction.DismissNotice) },
            icon = AppIcons.Camera,
        )
        null -> Unit
    }
}

@Composable
private fun AppMediaSourceSheet(state: MediaPickUi, onAction: (MediaPickAction) -> Unit) {
    val spacing = AppTheme.spacing
    AppBottomSheet(onDismiss = { onAction(MediaPickAction.Dismiss) }) {
        Column(
            modifier = Modifier.fillMaxWidth().padding(start = spacing.space16, end = spacing.space16, bottom = spacing.space24),
            verticalArrangement = Arrangement.spacedBy(spacing.space10),
        ) {
            AppText(text = stringResource(Res.string.media_source_title), style = AppTheme.typography.titleMedium)
            state.sources.forEach { source ->
                val enabled = source != MediaSource.CAMERA || state.cameraAvailable
                AppButton(
                    text = stringResource(source.label()),
                    onClick = { onAction(MediaPickAction.SourceChosen(source)) },
                    modifier = Modifier.fillMaxWidth(),
                    kind = ButtonKind.Secondary,
                    enabled = enabled,
                    leadingIcon = source.icon(),
                )
                if (!enabled) {
                    AppText(
                        text = stringResource(Res.string.media_source_camera_unavailable),
                        style = AppTheme.typography.bodySmall,
                        color = AppTheme.colors.muted,
                    )
                }
            }
        }
    }
}

private fun MediaSource.label(): StringResource = when (this) {
    MediaSource.CAMERA -> Res.string.media_source_camera
    MediaSource.LIBRARY -> Res.string.media_source_library
    MediaSource.FILES -> Res.string.media_source_files
}

private fun MediaSource.icon(): ImageVector = when (this) {
    MediaSource.CAMERA -> AppIcons.Camera
    MediaSource.LIBRARY -> AppIcons.Gallery
    MediaSource.FILES -> AppIcons.Legal
}
