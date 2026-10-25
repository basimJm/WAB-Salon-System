package com.fab.wab.merchant.designsystem.components.upload

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.platform.LocalLayoutDirection
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.runtime.CompositionLocalProvider
import androidx.compose.ui.unit.LayoutDirection
import com.fab.wab.merchant.core.domain.upload.UploadLimits
import com.fab.wab.merchant.core.domain.upload.UploadRejection
import com.fab.wab.merchant.designsystem.components.text.AppText
import com.fab.wab.merchant.designsystem.resources.Res
import com.fab.wab.merchant.designsystem.resources.upload_count
import com.fab.wab.merchant.designsystem.resources.upload_too_large
import com.fab.wab.merchant.designsystem.resources.upload_too_long
import com.fab.wab.merchant.designsystem.resources.upload_too_many
import com.fab.wab.merchant.designsystem.resources.upload_wrong_type
import com.fab.wab.merchant.designsystem.theme.AppTheme
import org.jetbrains.compose.resources.stringResource

/** Tiles per row in the document grid (design `repeat(3,1fr)`). */
const val DOCUMENT_GRID_COLUMNS = 3

private const val BYTES_PER_MB = 1_048_576L
private const val MILLIS_PER_SECOND = 1_000L

/**
 * License / registration documents (PRD M04, §12: 1–5 files, image or PDF, ≤ 10 MB): label + "n / max", hint,
 * a three-column grid of [AppUploadTile]s ending with the add tile while there is room, and the [error] line.
 */
@Composable
fun AppDocumentUploader(
    label: String,
    hint: String,
    items: List<UploadItemUi>,
    onAdd: () -> Unit,
    onRemove: (String) -> Unit,
    onRetry: (String) -> Unit,
    modifier: Modifier = Modifier,
    maxFiles: Int = UploadLimits.DOCUMENT_MAX_FILES,
    error: String? = null,
) {
    val colors = AppTheme.colors
    val spacing = AppTheme.spacing
    Column(modifier = modifier.fillMaxWidth(), verticalArrangement = Arrangement.spacedBy(spacing.space8)) {
        Row(verticalAlignment = Alignment.CenterVertically) {
            AppText(
                text = label,
                style = AppTheme.typography.labelMedium.copy(fontWeight = FontWeight.SemiBold),
                color = colors.accent,
                modifier = Modifier.weight(1f),
            )
            CompositionLocalProvider(LocalLayoutDirection provides LayoutDirection.Ltr) {
                AppText(
                    text = stringResource(Res.string.upload_count, items.size, maxFiles),
                    style = AppTheme.typography.labelSmall,
                    color = colors.faint,
                )
            }
        }
        AppText(text = hint, style = AppTheme.typography.bodySmall, color = colors.muted)
        val cells: List<UploadItemUi?> = items + if (items.size < maxFiles) listOf(null) else emptyList()
        cells.chunked(DOCUMENT_GRID_COLUMNS).forEach { row ->
            Row(horizontalArrangement = Arrangement.spacedBy(spacing.space8)) {
                row.forEach { item ->
                    if (item == null) {
                        AppUploadAddTile(onClick = onAdd, modifier = Modifier.weight(1f))
                    } else {
                        AppUploadTile(
                            item,
                            onRemove = { onRemove(item.id) },
                            onRetry = { onRetry(item.id) },
                            modifier = Modifier.weight(1f),
                        )
                    }
                }
                repeat(DOCUMENT_GRID_COLUMNS - row.size) { Spacer(Modifier.weight(1f)) }
            }
        }
        if (!error.isNullOrBlank()) AppText(text = error, style = AppTheme.typography.bodySmall, color = colors.danger)
    }
}

/** Message for a refused pick; [maxFiles] fills "up to n files". */
@Composable
fun uploadRejectionText(
    rejection: UploadRejection,
    maxFiles: Int = UploadLimits.DOCUMENT_MAX_FILES,
    maxBytes: Long = UploadLimits.DOCUMENT_MAX_BYTES,
): String =
    when (rejection) {
        UploadRejection.TOO_LARGE -> stringResource(Res.string.upload_too_large, (maxBytes / BYTES_PER_MB).toInt())
        UploadRejection.WRONG_TYPE -> stringResource(Res.string.upload_wrong_type)
        UploadRejection.TOO_LONG -> stringResource(
            Res.string.upload_too_long,
            (UploadLimits.VIDEO_MAX_DURATION_MS / MILLIS_PER_SECOND).toInt(),
        )
        UploadRejection.TOO_MANY -> stringResource(Res.string.upload_too_many, maxFiles)
    }
