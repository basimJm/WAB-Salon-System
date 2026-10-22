package com.fab.wab.merchant.feature.salon.presentation.screen

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import com.fab.wab.merchant.core.analytics.compose.TrackScreen
import com.fab.wab.merchant.core.domain.upload.UploadKind
import com.fab.wab.merchant.core.domain.upload.UploadLimits
import com.fab.wab.merchant.designsystem.components.badge.StatusTone
import com.fab.wab.merchant.designsystem.components.button.AppButton
import com.fab.wab.merchant.designsystem.components.button.ButtonKind
import com.fab.wab.merchant.designsystem.components.dialog.AppDialog
import com.fab.wab.merchant.designsystem.components.feedback.AppEmptyState
import com.fab.wab.merchant.designsystem.components.feedback.AppErrorState
import com.fab.wab.merchant.designsystem.components.feedback.AppLoadingIndicator
import com.fab.wab.merchant.designsystem.components.layout.AppScreen
import com.fab.wab.merchant.designsystem.components.media.AppMediaViewer
import com.fab.wab.merchant.designsystem.components.media.MediaItemUi
import com.fab.wab.merchant.designsystem.components.media.MediaKind
import com.fab.wab.merchant.designsystem.components.navigation.AppTopBar
import com.fab.wab.merchant.designsystem.components.text.AppText
import com.fab.wab.merchant.designsystem.components.upload.AppMediaGrid
import com.fab.wab.merchant.designsystem.components.upload.LocalPreview
import com.fab.wab.merchant.designsystem.components.upload.MediaGridMode
import com.fab.wab.merchant.designsystem.components.upload.UploadItemUi
import com.fab.wab.merchant.designsystem.components.upload.UploadStatus
import com.fab.wab.merchant.designsystem.components.upload.uploadRejectionText
import com.fab.wab.merchant.designsystem.icons.AppIcons
import com.fab.wab.merchant.designsystem.theme.AppTheme
import com.fab.wab.merchant.feature.salon.domain.GalleryItem
import com.fab.wab.merchant.feature.salon.domain.GalleryType
import com.fab.wab.merchant.feature.salon.presentation.analytics.SalonAnalytics
import com.fab.wab.merchant.feature.salon.presentation.controller.contract.GalleryContract.UiAction
import com.fab.wab.merchant.feature.salon.presentation.controller.contract.GalleryContract.UiState
import com.fab.wab.merchant.feature.salon.presentation.controller.contract.PendingMedia
import com.fab.wab.merchant.feature.salon.presentation.resources.Res
import com.fab.wab.merchant.feature.salon.presentation.resources.gallery_add
import com.fab.wab.merchant.feature.salon.presentation.resources.gallery_cancel
import com.fab.wab.merchant.feature.salon.presentation.resources.gallery_delete
import com.fab.wab.merchant.feature.salon.presentation.resources.gallery_delete_body
import com.fab.wab.merchant.feature.salon.presentation.resources.gallery_delete_title
import com.fab.wab.merchant.feature.salon.presentation.resources.gallery_done
import com.fab.wab.merchant.feature.salon.presentation.resources.gallery_empty_body
import com.fab.wab.merchant.feature.salon.presentation.resources.gallery_empty_title
import com.fab.wab.merchant.feature.salon.presentation.resources.gallery_hint
import com.fab.wab.merchant.feature.salon.presentation.resources.gallery_reorder
import com.fab.wab.merchant.feature.salon.presentation.resources.gallery_select
import com.fab.wab.merchant.feature.salon.presentation.resources.gallery_selected
import com.fab.wab.merchant.feature.salon.presentation.resources.gallery_title
import org.jetbrains.compose.resources.pluralStringResource
import org.jetbrains.compose.resources.stringResource

private const val MILLIS_PER_SECOND = 1_000L

/** PRD M14 (design 05 `on.gallery`): grid, add, upload progress / retry, reorder mode, select & delete. */
@Composable
fun GalleryScreen(state: UiState, onAction: (UiAction) -> Unit, onBack: () -> Unit, modifier: Modifier = Modifier) {
    TrackScreen(SalonAnalytics.SCREEN_GALLERY)
    AppScreen(
        modifier = modifier,
        topBar = { AppTopBar(title = stringResource(Res.string.gallery_title), onBack = onBack) },
        bottomBar = { if (!state.loading && state.error == null) GalleryBar(state, onAction) },
    ) { padding ->
        Box(modifier = Modifier.fillMaxSize().padding(padding)) {
            when {
                state.loading -> AppLoadingIndicator(Modifier.align(Alignment.Center))
                state.error != null -> AppErrorState(onRetry = { onAction(UiAction.OnRetry) }, message = state.error)
                state.isEmpty -> AppEmptyState(
                    title = stringResource(Res.string.gallery_empty_title),
                    message = stringResource(Res.string.gallery_empty_body),
                    modifier = Modifier.align(Alignment.Center).padding(AppTheme.spacing.space24),
                )
                else -> Column {
                    AppText(
                        text = stringResource(Res.string.gallery_hint),
                        style = AppTheme.typography.bodySmall,
                        color = AppTheme.colors.muted,
                        modifier = Modifier.padding(horizontal = AppTheme.spacing.space16, vertical = AppTheme.spacing.space8),
                    )
                    AppMediaGrid(
                        items = state.items.map { it.toUpload() } + state.pending.map { it.toUpload() },
                        mode = state.mode,
                        onItemClick = { onAction(UiAction.OnItemClick(it)) },
                        onMove = { from, to -> onAction(UiAction.OnMove(from, to)) },
                        onRetry = { onAction(UiAction.OnRetryItem(it)) },
                        selected = state.selected,
                        contentPadding = PaddingValues(AppTheme.spacing.space16),
                    )
                }
            }
        }
    }
    GalleryDialogs(state, onAction)
}

@Composable
private fun GalleryBar(state: UiState, onAction: (UiAction) -> Unit) {
    val spacing = AppTheme.spacing
    Row(
        modifier = Modifier.fillMaxWidth().padding(horizontal = spacing.space16, vertical = spacing.space10),
        horizontalArrangement = Arrangement.spacedBy(spacing.space10),
        verticalAlignment = Alignment.CenterVertically,
    ) {
        when (state.mode) {
            MediaGridMode.Normal -> {
                if (state.items.size > 1) {
                    AppButton(stringResource(Res.string.gallery_reorder), { onAction(UiAction.OnMode(MediaGridMode.Reorder)) }, kind = ButtonKind.Text)
                }
                if (state.items.isNotEmpty()) {
                    AppButton(stringResource(Res.string.gallery_select), { onAction(UiAction.OnMode(MediaGridMode.Select)) }, kind = ButtonKind.Text)
                }
                AppButton(stringResource(Res.string.gallery_add), { onAction(UiAction.OnAdd) }, Modifier.weight(1f), leadingIcon = AppIcons.Add, enabled = !state.busy)
            }
            MediaGridMode.Reorder -> AppButton(stringResource(Res.string.gallery_done), { onAction(UiAction.OnDone) }, Modifier.weight(1f), loading = state.busy)
            MediaGridMode.Select -> {
                AppText(
                    text = pluralStringResource(Res.plurals.gallery_selected, state.selected.size, state.selected.size),
                    style = AppTheme.typography.labelLarge,
                    modifier = Modifier.weight(1f),
                )
                AppButton(stringResource(Res.string.gallery_cancel), { onAction(UiAction.OnDone) }, kind = ButtonKind.Text)
                AppButton(
                    text = stringResource(Res.string.gallery_delete),
                    onClick = { onAction(UiAction.OnDeleteClick) },
                    kind = ButtonKind.Destructive,
                    enabled = state.selected.isNotEmpty(),
                    loading = state.busy,
                )
            }
        }
    }
}

@Composable
private fun GalleryDialogs(state: UiState, onAction: (UiAction) -> Unit) {
    if (state.deleteDialog) {
        AppDialog(
            title = pluralStringResource(Res.plurals.gallery_delete_title, state.selected.size, state.selected.size),
            confirmText = stringResource(Res.string.gallery_delete),
            onConfirm = { onAction(UiAction.OnDeleteConfirm) },
            onDismiss = { onAction(UiAction.OnDialogDismiss) },
            message = stringResource(Res.string.gallery_delete_body),
            dismissText = stringResource(Res.string.gallery_cancel),
            icon = AppIcons.Delete,
            tone = StatusTone.Danger,
        )
    }
    state.rejection?.let { rejection ->
        AppDialog(
            title = uploadRejectionText(rejection, UploadLimits.GALLERY_MAX_IMAGES, UploadLimits.IMAGE_MAX_BYTES),
            confirmText = stringResource(Res.string.gallery_done),
            onConfirm = { onAction(UiAction.OnDialogDismiss) },
            onDismiss = { onAction(UiAction.OnDialogDismiss) },
            tone = StatusTone.Warning,
        )
    }
    state.viewerIndex?.let { index ->
        AppMediaViewer(items = state.items.map { it.toMedia() }, startIndex = index, onClose = { onAction(UiAction.OnCloseViewer) })
    }
}

private fun GalleryItem.toUpload() = UploadItemUi(
    id = id,
    name = id,
    kind = if (type == GalleryType.VIDEO) UploadKind.VIDEO else UploadKind.IMAGE,
    status = UploadStatus.Uploaded,
    url = previewUrl,
    durationMs = durationSec?.let { it * MILLIS_PER_SECOND },
)

private fun PendingMedia.toUpload() = UploadItemUi(
    id = id,
    name = file.name,
    kind = file.kind,
    status = status,
    preview = if (type == GalleryType.IMAGE) LocalPreview(file.bytes) else null,
    durationMs = file.durationMs,
)

private fun GalleryItem.toMedia() = MediaItemUi(id, url, if (type == GalleryType.VIDEO) MediaKind.Video else MediaKind.Image, thumbnailUrl)
