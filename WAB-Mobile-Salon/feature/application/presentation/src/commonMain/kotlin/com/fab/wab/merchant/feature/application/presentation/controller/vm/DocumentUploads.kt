package com.fab.wab.merchant.feature.application.presentation.controller.vm

import com.fab.wab.merchant.core.domain.upload.LocalFile
import com.fab.wab.merchant.core.domain.upload.UploadFileUseCase
import com.fab.wab.merchant.core.domain.upload.UploadLimits
import com.fab.wab.merchant.core.domain.upload.UploadProgress
import com.fab.wab.merchant.core.domain.upload.UploadPurpose
import com.fab.wab.merchant.core.domain.upload.UploadRejection
import com.fab.wab.merchant.core.domain.upload.UploadSlot
import com.fab.wab.merchant.core.domain.upload.acceptUploads
import com.fab.wab.merchant.core.domain.upload.remainingSlots
import com.fab.wab.merchant.core.ui.media.PickedFile
import com.fab.wab.merchant.designsystem.components.upload.UploadStatus
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.launch

/** One license document of the form: the picked file (kept for retries), its upload state and confirmed key. */
data class DocumentUpload(val file: LocalFile, val status: UploadStatus, val key: String? = null)

internal fun PickedFile.toLocalFile(id: String) = LocalFile(
    id = id,
    name = name,
    bytes = bytes,
    contentType = contentType,
    durationMs = durationMs,
)

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

/**
 * The 1–5 license files of one [purpose] (trade license or a clinic's medical license, BUSINESS_DOMAIN §5.19): picks,
 * uploads through the public license routes, retries and removals; every change is reported through [onChange].
 */
internal class LicenseTray(
    private val purpose: UploadPurpose,
    private val scope: CoroutineScope,
    private val uploadFile: UploadFileUseCase,
    private val onUploaded: () -> Unit,
    private val onChange: (List<DocumentUpload>) -> Unit,
) {
    var items: List<DocumentUpload> = emptyList()
        private set
    private var nextFileId = 0

    val remaining: Int get() = remainingSlots(items.size, UploadLimits.DOCUMENT_MAX_FILES)

    /** Starts uploading the acceptable [files]; answers the first refusal (type, size or count) to show. */
    fun accept(files: List<PickedFile>, remaining: Int): UploadRejection? {
        val picked = files.map { it.toLocalFile(id = (nextFileId++).toString()) }
        val (accepted, refused) = acceptUploads(picked, UploadSlot.DOCUMENTS, remaining)
        accepted.forEach { start(DocumentUpload(it, UploadStatus.Uploading(0f))) }
        return refused.firstOrNull()
    }

    fun remove(id: String) = set(items.filterNot { it.file.id == id })

    fun retry(id: String) {
        items.firstOrNull { it.file.id == id }?.let(::start)
    }

    private fun start(upload: DocumentUpload) {
        val id = upload.file.id
        set(items.filterNot { it.file.id == id } + upload.copy(status = UploadStatus.Uploading(0f)))
        scope.launch {
            uploadFile(upload.file, purpose).collect { progress -> set(items.withProgress(id, progress)) }
            onUploaded()
        }
    }

    private fun set(next: List<DocumentUpload>) {
        items = next
        onChange(next)
    }
}
