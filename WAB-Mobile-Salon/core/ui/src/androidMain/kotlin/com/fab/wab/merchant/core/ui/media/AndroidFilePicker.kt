package com.fab.wab.merchant.core.ui.media

import android.content.ContentResolver
import android.content.Context
import android.media.MediaMetadataRetriever
import android.net.Uri
import android.provider.OpenableColumns
import androidx.activity.ComponentActivity
import androidx.activity.result.ActivityResultLauncher
import androidx.activity.result.PickVisualMediaRequest
import androidx.activity.result.contract.ActivityResultContracts
import kotlinx.coroutines.CompletableDeferred
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext

/** Activity-bound launchers for documents and multi-select media (attached by MainActivity); one request at a time. */
class AndroidFilePickerBridge {
    private var documents: ActivityResultLauncher<Array<String>>? = null
    private var media: ActivityResultLauncher<PickVisualMediaRequest>? = null
    private var pending: CompletableDeferred<List<Uri>>? = null

    fun attach(activity: ComponentActivity) {
        documents = activity.registerForActivityResult(ActivityResultContracts.OpenMultipleDocuments()) { complete(it) }
        media = activity.registerForActivityResult(ActivityResultContracts.PickMultipleVisualMedia(AndroidPickerLimits.MEDIA_MAX)) {
            complete(it)
        }
    }

    fun detach() {
        documents?.unregister()
        media?.unregister()
        documents = null
        media = null
        pending?.cancel()
        pending = null
    }

    suspend fun pickDocuments(): List<Uri> = launch { documents?.launch(DOCUMENT_TYPES) != null }

    suspend fun pickMedia(includeVideo: Boolean): List<Uri> {
        val type = if (includeVideo) {
            ActivityResultContracts.PickVisualMedia.ImageAndVideo
        } else {
            ActivityResultContracts.PickVisualMedia.ImageOnly
        }
        return launch { media?.launch(PickVisualMediaRequest(type)) != null }
    }

    private suspend fun launch(start: () -> Boolean): List<Uri> {
        val answer = CompletableDeferred<List<Uri>>()
        pending = answer
        if (!start()) return emptyList()
        return answer.await()
    }

    private fun complete(uris: List<Uri>) {
        pending?.complete(uris)
        pending = null
    }

    private companion object {
        const val ANY_SUBTYPE = "*"
        const val IMAGE_TYPE = "image"
        val DOCUMENT_TYPES = arrayOf(FilePickerDefaults.PDF_CONTENT_TYPE, "$IMAGE_TYPE/$ANY_SUBTYPE")
    }
}

/** Reads picked URIs into [PickedFile]s: images compressed (`AndroidImageCodec`), PDFs and videos as they are. */
class AndroidFilePicker(private val context: Context, private val bridge: AndroidFilePickerBridge) : FilePicker {

    override suspend fun pickDocuments(maxCount: Int): List<PickedFile> = read(bridge.pickDocuments().take(maxCount))

    override suspend fun pickMedia(maxCount: Int, includeVideo: Boolean): List<PickedFile> =
        read(bridge.pickMedia(includeVideo).take(maxCount))

    private suspend fun read(uris: List<Uri>): List<PickedFile> = withContext(Dispatchers.IO) {
        val resolver = context.contentResolver
        uris.mapNotNull { uri -> readOne(resolver, uri) }
    }

    private fun readOne(resolver: ContentResolver, uri: Uri): PickedFile? {
        val type = resolver.getType(uri) ?: return null
        val name = displayName(resolver, uri)
        val bytes = resolver.openInputStream(uri)?.use { it.readBytes() } ?: return null
        return when {
            type.startsWith(IMAGE_PREFIX) -> AndroidImageCodec.compress(bytes, FilePickerDefaults.MAX_IMAGE_DIMENSION_PX)
                ?.let { PickedFile(name, it.bytes, it.contentType) }
            type.startsWith(VIDEO_PREFIX) -> PickedFile(name, bytes, type, durationMs(uri))
            else -> PickedFile(name, bytes, type)
        }
    }

    private fun displayName(resolver: ContentResolver, uri: Uri): String =
        resolver.query(uri, arrayOf(OpenableColumns.DISPLAY_NAME), null, null, null)?.use { cursor ->
            if (cursor.moveToFirst()) cursor.getString(0) else null
        } ?: FilePickerDefaults.FALLBACK_NAME

    private fun durationMs(uri: Uri): Long? {
        val retriever = MediaMetadataRetriever()
        return try {
            retriever.setDataSource(context, uri)
            retriever.extractMetadata(MediaMetadataRetriever.METADATA_KEY_DURATION)?.toLongOrNull()
        } catch (ignored: IllegalArgumentException) {
            null
        } finally {
            retriever.release()
        }
    }

    private companion object {
        const val IMAGE_PREFIX = "image/"
        const val VIDEO_PREFIX = "video/"
    }
}

/** Crops with `Bitmap.createBitmap` after a sampled decode, then compresses like the pickers. */
class AndroidImageCropper : ImageCropper {
    override suspend fun crop(bytes: ByteArray, region: CropRegion): PickedImage? = withContext(Dispatchers.Default) {
        AndroidImageCodec.cropAndCompress(bytes, region, FilePickerDefaults.MAX_IMAGE_DIMENSION_PX)
    }
}

internal object AndroidPickerLimits {
    /** Registration-time cap of the system photo picker; callers trim to their own maximum. */
    const val MEDIA_MAX = 20
}
