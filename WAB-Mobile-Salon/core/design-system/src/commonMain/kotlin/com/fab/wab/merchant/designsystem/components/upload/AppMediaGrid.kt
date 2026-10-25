package com.fab.wab.merchant.designsystem.components.upload

import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.BoxScope
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.aspectRatio
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.lazy.grid.GridCells
import androidx.compose.foundation.lazy.grid.LazyVerticalGrid
import androidx.compose.foundation.lazy.grid.itemsIndexed
import androidx.compose.foundation.lazy.grid.rememberLazyGridState
import androidx.compose.material3.Icon
import androidx.compose.material3.LinearProgressIndicator
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.semantics.Role
import androidx.compose.ui.semantics.contentDescription
import androidx.compose.ui.semantics.selected
import androidx.compose.ui.semantics.semantics
import androidx.compose.ui.text.font.FontWeight
import com.fab.wab.merchant.core.domain.upload.UploadKind
import com.fab.wab.merchant.designsystem.components.glass.glassClickable
import com.fab.wab.merchant.designsystem.components.glass.rememberGlassPress
import com.fab.wab.merchant.designsystem.components.image.AppImage
import com.fab.wab.merchant.designsystem.components.image.AppImageFallback
import com.fab.wab.merchant.designsystem.components.text.AppText
import com.fab.wab.merchant.designsystem.icons.AppIcons
import com.fab.wab.merchant.designsystem.resources.Res
import com.fab.wab.merchant.designsystem.resources.media_duration
import com.fab.wab.merchant.designsystem.resources.media_first
import com.fab.wab.merchant.designsystem.resources.media_order_position
import com.fab.wab.merchant.designsystem.resources.media_selected
import com.fab.wab.merchant.designsystem.resources.upload_percent
import com.fab.wab.merchant.designsystem.theme.AppTheme
import org.jetbrains.compose.resources.stringResource

/** Gallery modes of design 05 Salon: browse (first item marked), reorder (numbers, drag), select (checks). */
enum class MediaGridMode { Normal, Reorder, Select }

private const val MEDIA_GRID_COLUMNS = 3
private const val SQUARE = 1f

/**
 * Photos and videos (PRD M14): uploading cells show progress, failed cells retry on tap. In [MediaGridMode.Reorder]
 * a long press drags a cell and a tap moves it one place earlier (design prototype); in [MediaGridMode.Select] a tap
 * toggles [selected] through [onItemClick].
 */
@Composable
fun AppMediaGrid(
    items: List<UploadItemUi>,
    mode: MediaGridMode,
    onItemClick: (String) -> Unit,
    onMove: (from: Int, to: Int) -> Unit,
    onRetry: (String) -> Unit,
    modifier: Modifier = Modifier,
    selected: Set<String> = emptySet(),
    contentPadding: PaddingValues = PaddingValues(),
) {
    val grid = rememberLazyGridState()
    val reorder = rememberGridReorderState(grid, onMove)
    val spacing = AppTheme.spacing
    LazyVerticalGrid(
        columns = GridCells.Fixed(MEDIA_GRID_COLUMNS),
        state = grid,
        modifier = modifier,
        contentPadding = contentPadding,
        horizontalArrangement = Arrangement.spacedBy(spacing.space6),
        verticalArrangement = Arrangement.spacedBy(spacing.space6),
    ) {
        itemsIndexed(items, key = { _, item -> item.id }, contentType = { _, item -> item.kind }) { index, item ->
            val onTap = when {
                item.status == UploadStatus.Failed -> ({ onRetry(item.id) })
                mode == MediaGridMode.Reorder -> ({ if (index > 0) onMove(index, index - 1) })
                else -> ({ onItemClick(item.id) })
            }
            MediaCell(
                item = item,
                index = index,
                mode = mode,
                isSelected = item.id in selected,
                onTap = onTap,
                modifier = Modifier.reorderable(reorder, item.id, enabled = mode == MediaGridMode.Reorder),
            )
        }
    }
}

@Composable
private fun MediaCell(
    item: UploadItemUi,
    index: Int,
    mode: MediaGridMode,
    isSelected: Boolean,
    onTap: () -> Unit,
    modifier: Modifier = Modifier,
) {
    val colors = AppTheme.colors
    val shape = AppTheme.shapes.medium
    val press = rememberGlassPress()
    val selectedLabel = stringResource(Res.string.media_selected)
    val positionLabel = stringResource(Res.string.media_order_position, index + 1)
    Box(
        modifier = modifier
            .fillMaxWidth()
            .aspectRatio(SQUARE)
            .clip(shape)
            .background(colors.surface)
            .then(if (isSelected) Modifier.border(AppTheme.sizes.borderWidth, colors.gradientEnd, shape) else Modifier)
            .semantics {
                this.selected = isSelected
                if (mode == MediaGridMode.Reorder) contentDescription = positionLabel
                if (isSelected) contentDescription = selectedLabel
            }
            .glassClickable(press, role = Role.Button, onClick = onTap),
    ) {
        val preview = item.preview
        val url = item.url
        when {
            preview != null -> AppImage(preview.bytes, Modifier.fillMaxSize())
            url != null -> AppImage(url, Modifier.fillMaxSize())
            else -> AppImageFallback()
        }
        CellBadges(item, index, mode, isSelected)
        CellStatus(item)
    }
}

@Composable
private fun BoxScope.CellBadges(item: UploadItemUi, index: Int, mode: MediaGridMode, isSelected: Boolean) {
    val colors = AppTheme.colors
    val spacing = AppTheme.spacing
    val corner = Modifier.padding(spacing.space6)
    when (mode) {
        MediaGridMode.Normal -> if (index == 0 && item.status == UploadStatus.Uploaded) {
            Badge(stringResource(Res.string.media_first), corner.align(Alignment.TopStart))
        }
        MediaGridMode.Reorder -> Badge((index + 1).toString(), corner.align(Alignment.TopStart))
        MediaGridMode.Select -> Box(
            modifier = corner.align(Alignment.TopEnd)
                .size(AppTheme.sizes.removeBadge)
                .background(if (isSelected) colors.gradientEnd else colors.scrim, AppTheme.shapes.circle)
                .border(AppTheme.sizes.hairline, colors.onMedia, AppTheme.shapes.circle),
            contentAlignment = Alignment.Center,
        ) {
            if (isSelected) Icon(
                AppIcons.Check,
                contentDescription = null,
                tint = colors.onMedia,
                modifier = Modifier.size(AppTheme.sizes.iconSmall),
            )
        }
    }
    val duration = item.durationMs
    if (item.kind == UploadKind.VIDEO && duration != null) {
        val (minutes, seconds) = durationParts(duration)
        Row(
            modifier = corner.align(Alignment.BottomStart).background(
                colors.scrim,
                AppTheme.shapes.small,
            ).padding(horizontal = spacing.space6),
            verticalAlignment = Alignment.CenterVertically,
            horizontalArrangement = Arrangement.spacedBy(spacing.space2),
        ) {
            Icon(AppIcons.Play, contentDescription = null, tint = colors.onMedia, modifier = Modifier.size(AppTheme.sizes.brideIcon))
            AppText(
                text = stringResource(Res.string.media_duration, minutes, seconds),
                style = AppTheme.typography.labelSmall,
                color = colors.onMedia,
            )
        }
    }
}

@Composable
private fun Badge(text: String, modifier: Modifier = Modifier) {
    val colors = AppTheme.colors
    AppText(
        text = text,
        style = AppTheme.typography.labelSmall.copy(fontWeight = FontWeight.Bold),
        color = colors.onMedia,
        maxLines = 1,
        modifier = modifier.background(colors.scrim, AppTheme.shapes.small).padding(horizontal = AppTheme.spacing.space6),
    )
}

@Composable
private fun BoxScope.CellStatus(item: UploadItemUi) {
    val colors = AppTheme.colors
    when (val status = item.status) {
        is UploadStatus.Uploading -> Box(Modifier.matchParentSize().background(colors.scrim), contentAlignment = Alignment.Center) {
            AppText(
                text = stringResource(Res.string.upload_percent, uploadPercent(status.progress)),
                style = AppTheme.typography.labelMedium,
                color = colors.onMedia,
            )
            LinearProgressIndicator(
                progress = { status.progress },
                modifier = Modifier.fillMaxWidth().align(Alignment.BottomCenter).padding(AppTheme.spacing.space6),
                color = colors.onMedia,
                trackColor = colors.onMedia.copy(alpha = AppTheme.alpha.hover),
            )
        }
        UploadStatus.Failed -> Box(Modifier.matchParentSize().background(colors.dangerContainer), contentAlignment = Alignment.Center) {
            Icon(
                AppIcons.Refresh,
                contentDescription = null,
                tint = colors.onDangerContainer,
                modifier = Modifier.size(AppTheme.sizes.iconLarge),
            )
        }
        UploadStatus.Uploaded -> Unit
    }
}
