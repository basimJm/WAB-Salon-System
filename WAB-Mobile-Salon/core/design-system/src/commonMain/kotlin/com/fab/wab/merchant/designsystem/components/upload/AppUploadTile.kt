package com.fab.wab.merchant.designsystem.components.upload

import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.BoxScope
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
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
import com.fab.wab.merchant.core.domain.upload.UploadKind
import com.fab.wab.merchant.designsystem.components.glass.glassBackground
import com.fab.wab.merchant.designsystem.components.glass.glassClickable
import com.fab.wab.merchant.designsystem.components.glass.rememberGlassPress
import com.fab.wab.merchant.designsystem.components.image.AppImage
import com.fab.wab.merchant.designsystem.components.text.AppText
import com.fab.wab.merchant.designsystem.icons.AppIcons
import com.fab.wab.merchant.designsystem.resources.Res
import com.fab.wab.merchant.designsystem.resources.upload_add
import com.fab.wab.merchant.designsystem.resources.upload_add_document_hint
import com.fab.wab.merchant.designsystem.resources.upload_failed
import com.fab.wab.merchant.designsystem.resources.upload_pdf
import com.fab.wab.merchant.designsystem.resources.upload_percent
import com.fab.wab.merchant.designsystem.resources.upload_remove
import com.fab.wab.merchant.designsystem.resources.upload_retry
import com.fab.wab.merchant.designsystem.theme.AppTheme
import com.fab.wab.merchant.designsystem.theme.GlassStyle
import org.jetbrains.compose.resources.stringResource

/**
 * Document tile (design 01 Onboarding, license documents): thumbnail or PDF mark, name + size, progress bar and
 * percent while uploading, rose border + "Upload failed" + Retry on failure, remove (✕) once settled.
 */
@Composable
fun AppUploadTile(
    item: UploadItemUi,
    onRemove: () -> Unit,
    onRetry: () -> Unit,
    modifier: Modifier = Modifier,
) {
    val colors = AppTheme.colors
    val shape = AppTheme.shapes.medium
    val failed = item.status == UploadStatus.Failed
    Box(
        modifier = modifier
            .height(AppTheme.sizes.uploadTile)
            .clip(shape)
            .glassBackground(AppTheme.glass, shape, GlassStyle.Subtle, stateBorder = if (failed) colors.danger else colors.line),
    ) {
        TilePreview(item)
        TileOverlay(item)
        TileCaption(item, onRetry, Modifier.align(Alignment.BottomCenter))
        if (item.isRemovable) RemoveButton(onRemove, Modifier.align(Alignment.TopEnd))
    }
}

@Composable
private fun BoxScope.TilePreview(item: UploadItemUi) {
    val preview = item.preview
    val url = item.url
    when {
        item.kind == UploadKind.DOCUMENT -> PdfMark(Modifier.align(Alignment.TopCenter).padding(top = AppTheme.spacing.space12))
        preview != null -> AppImage(preview.bytes, Modifier.fillMaxSize())
        url != null -> AppImage(url, Modifier.fillMaxSize())
    }
}

@Composable
private fun PdfMark(modifier: Modifier = Modifier) {
    val colors = AppTheme.colors
    Box(
        modifier = modifier.size(AppTheme.sizes.pdfMarkWidth, AppTheme.sizes.pdfMarkHeight).background(colors.dangerContainer, AppTheme.shapes.small),
        contentAlignment = Alignment.BottomCenter,
    ) {
        AppText(
            text = stringResource(Res.string.upload_pdf),
            style = AppTheme.typography.labelSmall.copy(fontWeight = FontWeight.Bold),
            color = colors.onDangerContainer,
            modifier = Modifier.padding(bottom = AppTheme.spacing.space6),
        )
    }
}

@Composable
private fun BoxScope.TileOverlay(item: UploadItemUi) {
    val colors = AppTheme.colors
    val overlay = Modifier.fillMaxWidth().padding(bottom = AppTheme.sizes.uploadCaption).align(Alignment.TopCenter)
    when (val status = item.status) {
        is UploadStatus.Uploading -> Box(
            modifier = overlay.fillMaxSize().background(colors.scrim.copy(alpha = AppTheme.alpha.hover)),
            contentAlignment = Alignment.Center,
        ) {
            AppText(
                text = stringResource(Res.string.upload_percent, uploadPercent(status.progress)),
                style = AppTheme.typography.labelMedium.copy(fontWeight = FontWeight.Bold),
                color = colors.accent,
            )
        }
        UploadStatus.Failed -> Column(
            modifier = overlay.fillMaxSize().background(colors.dangerContainer),
            horizontalAlignment = Alignment.CenterHorizontally,
            verticalArrangement = Arrangement.Center,
        ) {
            Icon(AppIcons.Error, contentDescription = null, tint = colors.onDangerContainer, modifier = Modifier.size(AppTheme.sizes.icon))
            AppText(text = stringResource(Res.string.upload_failed), style = AppTheme.typography.labelSmall, color = colors.onDangerContainer)
        }
        UploadStatus.Uploaded -> Unit
    }
}

@Composable
private fun TileCaption(item: UploadItemUi, onRetry: () -> Unit, modifier: Modifier = Modifier) {
    val colors = AppTheme.colors
    val press = rememberGlassPress()
    Column(
        modifier = modifier
            .fillMaxWidth()
            .background(colors.card)
            .padding(horizontal = AppTheme.spacing.space6, vertical = AppTheme.spacing.space6),
    ) {
        AppText(text = item.name, style = AppTheme.typography.labelSmall, maxLines = 1)
        when (val status = item.status) {
            is UploadStatus.Uploading -> LinearProgressIndicator(
                progress = { status.progress },
                modifier = Modifier.fillMaxWidth().padding(top = AppTheme.spacing.space4),
                color = colors.accent,
                trackColor = colors.soft,
            )
            UploadStatus.Failed -> AppText(
                text = stringResource(Res.string.upload_retry),
                style = AppTheme.typography.labelSmall.copy(fontWeight = FontWeight.Bold),
                color = colors.danger,
                modifier = Modifier.glassClickable(press, role = Role.Button, onClick = onRetry),
            )
            UploadStatus.Uploaded -> item.sizeText?.let {
                AppText(text = it, style = AppTheme.typography.labelSmall, color = colors.faint, maxLines = 1)
            }
        }
    }
}

/** Small dark ✕ in the top corner (touch area padded to the minimum target). */
@Composable
internal fun RemoveButton(onRemove: () -> Unit, modifier: Modifier = Modifier) {
    val colors = AppTheme.colors
    val press = rememberGlassPress()
    Box(
        modifier = modifier
            .size(AppTheme.sizes.touchTarget)
            .glassClickable(press, role = Role.Button, onClick = onRemove),
        contentAlignment = Alignment.Center,
    ) {
        Box(
            modifier = Modifier.size(AppTheme.sizes.removeBadge).background(colors.scrim, AppTheme.shapes.circle),
            contentAlignment = Alignment.Center,
        ) {
            Icon(AppIcons.Close, contentDescription = stringResource(Res.string.upload_remove), tint = colors.onMedia, modifier = Modifier.size(AppTheme.sizes.brideIcon))
        }
    }
}

/** The dashed "+ Add" tile that ends a document grid (design `addTile`). */
@Composable
fun AppUploadAddTile(onClick: () -> Unit, modifier: Modifier = Modifier, hint: String = stringResource(Res.string.upload_add_document_hint)) {
    val colors = AppTheme.colors
    val shape = AppTheme.shapes.medium
    val press = rememberGlassPress()
    Column(
        modifier = modifier
            .height(AppTheme.sizes.uploadTile)
            .clip(shape)
            .border(AppTheme.sizes.borderWidth, colors.line, shape)
            .glassClickable(press, role = Role.Button, onClick = onClick),
        horizontalAlignment = Alignment.CenterHorizontally,
        verticalArrangement = Arrangement.spacedBy(AppTheme.spacing.space4, Alignment.CenterVertically),
    ) {
        Box(
            modifier = Modifier.size(AppTheme.sizes.avatarSmall).background(colors.soft, AppTheme.shapes.circle),
            contentAlignment = Alignment.Center,
        ) {
            Icon(AppIcons.Add, contentDescription = null, tint = colors.accent, modifier = Modifier.size(AppTheme.sizes.icon))
        }
        AppText(text = stringResource(Res.string.upload_add), style = AppTheme.typography.labelMedium.copy(fontWeight = FontWeight.Bold))
        AppText(text = hint, style = AppTheme.typography.labelSmall, color = colors.faint)
    }
}
