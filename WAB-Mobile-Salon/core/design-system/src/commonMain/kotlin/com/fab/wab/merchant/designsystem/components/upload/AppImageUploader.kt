package com.fab.wab.merchant.designsystem.components.upload

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.aspectRatio
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.material3.Icon
import androidx.compose.material3.LinearProgressIndicator
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.semantics.Role
import androidx.compose.ui.text.font.FontWeight
import com.fab.wab.merchant.designsystem.components.glass.glassBackground
import com.fab.wab.merchant.designsystem.components.glass.glassClickable
import com.fab.wab.merchant.designsystem.components.glass.rememberGlassPress
import com.fab.wab.merchant.designsystem.components.image.AppImage
import com.fab.wab.merchant.designsystem.components.text.AppText
import com.fab.wab.merchant.designsystem.icons.AppIcons
import com.fab.wab.merchant.designsystem.resources.Res
import com.fab.wab.merchant.designsystem.resources.upload_add
import com.fab.wab.merchant.designsystem.resources.upload_change_image
import com.fab.wab.merchant.designsystem.resources.upload_failed
import com.fab.wab.merchant.designsystem.resources.upload_percent
import com.fab.wab.merchant.designsystem.resources.upload_retry
import com.fab.wab.merchant.designsystem.theme.AppTheme
import com.fab.wab.merchant.designsystem.theme.GlassStyle
import org.jetbrains.compose.resources.stringResource

/**
 * Single image slot in the [CropAspect] of its purpose (cover 16:9, profile 1:1; PRD M13): empty → "+ Add",
 * picked → preview with progress, failed → retry, uploaded → tap to change. The host opens the picker, then
 * [AppImageCropper], then uploads the cropped bytes.
 */
@Composable
fun AppImageUploader(
    item: UploadItemUi?,
    aspect: CropAspect,
    onPick: () -> Unit,
    onRetry: () -> Unit,
    modifier: Modifier = Modifier,
    hint: String? = null,
) {
    val colors = AppTheme.colors
    val shape = AppTheme.shapes.large
    val press = rememberGlassPress()
    val failed = item?.status == UploadStatus.Failed
    Box(
        modifier = modifier
            .fillMaxWidth()
            .aspectRatio(aspect.ratio)
            .clip(shape)
            .glassBackground(AppTheme.glass, shape, GlassStyle.Subtle, stateBorder = if (failed) colors.danger else colors.line)
            .glassClickable(press, role = Role.Button, onClick = if (failed) onRetry else onPick),
        contentAlignment = Alignment.Center,
    ) {
        val preview = item?.preview
        val url = item?.url
        when {
            preview != null -> AppImage(preview.bytes, Modifier.fillMaxSize())
            url != null -> AppImage(url, Modifier.fillMaxSize())
            else -> EmptySlot(hint)
        }
        when (val status = item?.status) {
            is UploadStatus.Uploading -> UploadingOverlay(status.progress)
            UploadStatus.Failed -> FailedOverlay()
            UploadStatus.Uploaded -> ChangeChip(Modifier.align(Alignment.BottomEnd).padding(AppTheme.spacing.space8))
            null -> Unit
        }
    }
}

@Composable
private fun EmptySlot(hint: String?) {
    val colors = AppTheme.colors
    Column(horizontalAlignment = Alignment.CenterHorizontally, verticalArrangement = Arrangement.spacedBy(AppTheme.spacing.space4)) {
        Box(
            modifier = Modifier.size(AppTheme.sizes.avatarSmall).background(colors.soft, AppTheme.shapes.circle),
            contentAlignment = Alignment.Center,
        ) {
            Icon(AppIcons.Add, contentDescription = null, tint = colors.accent, modifier = Modifier.size(AppTheme.sizes.icon))
        }
        AppText(text = stringResource(Res.string.upload_add), style = AppTheme.typography.labelMedium.copy(fontWeight = FontWeight.Bold))
        if (!hint.isNullOrBlank()) AppText(text = hint, style = AppTheme.typography.labelSmall, color = colors.faint)
    }
}

@Composable
private fun UploadingOverlay(progress: Float) {
    val colors = AppTheme.colors
    Column(
        modifier = Modifier.fillMaxSize().background(colors.scrim),
        horizontalAlignment = Alignment.CenterHorizontally,
        verticalArrangement = Arrangement.spacedBy(AppTheme.spacing.space6, Alignment.CenterVertically),
    ) {
        AppText(
            text = stringResource(Res.string.upload_percent, uploadPercent(progress)),
            style = AppTheme.typography.labelLarge,
            color = colors.onMedia,
        )
        LinearProgressIndicator(
            progress = { progress },
            modifier = Modifier.fillMaxWidth().padding(horizontal = AppTheme.spacing.space24),
            color = colors.onMedia,
            trackColor = colors.onMedia.copy(alpha = AppTheme.alpha.hover),
        )
    }
}

@Composable
private fun FailedOverlay() {
    val colors = AppTheme.colors
    Column(
        modifier = Modifier.fillMaxSize().background(colors.dangerContainer),
        horizontalAlignment = Alignment.CenterHorizontally,
        verticalArrangement = Arrangement.spacedBy(AppTheme.spacing.space4, Alignment.CenterVertically),
    ) {
        Icon(AppIcons.Refresh, contentDescription = null, tint = colors.onDangerContainer, modifier = Modifier.size(AppTheme.sizes.icon))
        AppText(text = stringResource(Res.string.upload_failed), style = AppTheme.typography.labelMedium, color = colors.onDangerContainer)
        AppText(
            text = stringResource(Res.string.upload_retry),
            style = AppTheme.typography.labelSmall.copy(fontWeight = FontWeight.Bold),
            color = colors.danger,
        )
    }
}

@Composable
private fun ChangeChip(modifier: Modifier = Modifier) {
    val colors = AppTheme.colors
    AppText(
        text = stringResource(Res.string.upload_change_image),
        style = AppTheme.typography.labelSmall.copy(fontWeight = FontWeight.Bold),
        color = colors.onMedia,
        modifier = modifier
            .background(colors.scrim, AppTheme.shapes.small)
            .padding(horizontal = AppTheme.spacing.space10, vertical = AppTheme.spacing.space4),
    )
}
