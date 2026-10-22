package com.fab.wab.merchant.feature.application.presentation.controller.vm

import com.fab.wab.merchant.core.domain.upload.LocalFile
import com.fab.wab.merchant.core.domain.upload.UploadProgress
import com.fab.wab.merchant.core.ui.media.PickedFile
import com.fab.wab.merchant.designsystem.components.upload.UploadStatus

/** One license document of the form: the picked file (kept for retries), its upload state and confirmed key. */
data class DocumentUpload(val file: LocalFile, val status: UploadStatus, val key: String? = null)

internal fun PickedFile.toLocalFile(id: String) = LocalFile(id = id, name = name, bytes = bytes, contentType = contentType, durationMs = durationMs)

/** Folds one progress step of [id] into the list. */
internal fun List<DocumentUpload>.withProgress(id: String, progress: UploadProgress): List<DocumentUpload> = map { upload ->
    if (upload.file.id != id) return@map upload
    when (progress) {
        is UploadProgress.Uploading -> upload.copy(status = UploadStatus.Uploading(progress.fraction))
        is UploadProgress.Done -> upload.copy(status = UploadStatus.Uploaded, key = progress.upload.key)
        is UploadProgress.Failed -> upload.copy(status = UploadStatus.Failed, key = null)
    }
}

internal val List<DocumentUpload>.confirmedKeys: List<String> get() = mapNotNull { it.key }

internal val List<DocumentUpload>.anyUploading: Boolean get() = any { it.status is UploadStatus.Uploading }
