package com.fab.wab.merchant.designsystem.preview

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.runtime.Composable
import androidx.compose.runtime.CompositionLocalProvider
import androidx.compose.ui.Modifier
import androidx.compose.ui.platform.LocalLayoutDirection
import androidx.compose.ui.tooling.preview.Preview
import androidx.compose.ui.unit.LayoutDirection
import com.fab.wab.merchant.core.domain.upload.UploadKind
import com.fab.wab.merchant.designsystem.components.layout.AppScreen
import com.fab.wab.merchant.designsystem.components.upload.AppDocumentUploader
import com.fab.wab.merchant.designsystem.components.upload.AppImageUploader
import com.fab.wab.merchant.designsystem.components.upload.AppMediaGrid
import com.fab.wab.merchant.designsystem.components.upload.CropAspect
import com.fab.wab.merchant.designsystem.components.upload.MediaGridMode
import com.fab.wab.merchant.designsystem.components.upload.UploadItemUi
import com.fab.wab.merchant.designsystem.components.upload.UploadStatus
import com.fab.wab.merchant.designsystem.theme.AppTheme

private const val HALF_DONE = 0.45f
private const val VIDEO_MS = 15_000L

private val Documents = listOf(
    UploadItemUi("d1", "license.pdf", UploadKind.DOCUMENT, UploadStatus.Uploaded, sizeText = "1.2 MB"),
    UploadItemUi("d2", "IMG_2041.jpg", UploadKind.IMAGE, UploadStatus.Uploading(HALF_DONE)),
    UploadItemUi("d3", "scan.pdf", UploadKind.DOCUMENT, UploadStatus.Failed),
)

private val Media = listOf(
    UploadItemUi("m1", "1.jpg", UploadKind.IMAGE, UploadStatus.Uploaded),
    UploadItemUi("m2", "2.mp4", UploadKind.VIDEO, UploadStatus.Uploaded, durationMs = VIDEO_MS),
    UploadItemUi("m3", "3.jpg", UploadKind.IMAGE, UploadStatus.Uploading(HALF_DONE)),
    UploadItemUi("m4", "4.jpg", UploadKind.IMAGE, UploadStatus.Failed),
    UploadItemUi("m5", "5.jpg", UploadKind.IMAGE, UploadStatus.Uploaded),
)

/** Uploaders of MER-016: documents (design 01), cover 16:9 slot and the gallery grid (design 05). */
@Composable
private fun UploadGallery(mode: MediaGridMode) {
    val spacing = AppTheme.spacing
    AppScreen {
        Column(modifier = Modifier.padding(spacing.space20), verticalArrangement = Arrangement.spacedBy(spacing.space16)) {
            AppDocumentUploader(
                label = "وثائق الترخيص",
                hint = "ارفع من 1 إلى 5 ملفات (صورة أو PDF، حتى 10 ميغابايت للملف).",
                items = Documents,
                onAdd = {},
                onRemove = {},
                onRetry = {},
            )
            AppImageUploader(item = null, aspect = CropAspect.WIDE, onPick = {}, onRetry = {}, hint = "16:9")
            AppMediaGrid(
                items = Media,
                mode = mode,
                onItemClick = {},
                onMove = { _, _ -> },
                onRetry = {},
                selected = setOf("m2"),
                modifier = Modifier.height(AppTheme.sizes.uploadTile * 2 + spacing.space6),
            )
        }
    }
}

@Composable
private fun UploadFrame(dark: Boolean, rtl: Boolean, mode: MediaGridMode) {
    val direction = if (rtl) LayoutDirection.Rtl else LayoutDirection.Ltr
    CompositionLocalProvider(LocalLayoutDirection provides direction) {
        AppTheme(darkTheme = dark) { UploadGallery(mode) }
    }
}

@Preview(widthDp = 390, heightDp = 1000)
@Composable
private fun UploadLightRtlPreview() = UploadFrame(dark = false, rtl = true, mode = MediaGridMode.Normal)

@Preview(widthDp = 390, heightDp = 1000)
@Composable
private fun UploadDarkReorderPreview() = UploadFrame(dark = true, rtl = true, mode = MediaGridMode.Reorder)

@Preview(widthDp = 390, heightDp = 1000)
@Composable
private fun UploadLightLtrSelectPreview() = UploadFrame(dark = false, rtl = false, mode = MediaGridMode.Select)
