package com.fab.wab.merchant.core.ui.media

import android.content.ContentResolver
import android.content.Context
import android.content.Intent
import android.content.pm.PackageManager
import android.media.MediaMetadataRetriever
import android.net.Uri
import android.provider.MediaStore
import android.provider.OpenableColumns
import java.io.File
import java.io.IOException
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext

/**
 * Photo Picker (no permission), the documents UI and the system camera app (`TakePicture` into a FileProvider file,
 * full resolution, no CAMERA permission). Images are turned upright, bounded and JPEG-compressed on the device.
 */
class AndroidFilePicker(private val context: Context, private val bridge: AndroidFilePickerBridge) : FilePicker {

    override val isCameraAvailable: Boolean
        get() = context.packageManager.hasSystemFeature(PackageManager.FEATURE_CAMERA_ANY) &&
            Intent(MediaStore.ACTION_IMAGE_CAPTURE).resolveActivity(context.packageManager) != null

    override suspend fun pick(request: PickRequest): PickResult = when (request.source) {
        MediaSource.CAMERA -> capture()
        MediaSource.LIBRARY -> read(bridge.pickMedia(request.maxCount, request.includeVideo).take(request.maxCount))
        MediaSource.FILES -> read(bridge.pickDocuments().take(request.maxCount))
    }

    override fun openCameraSettings() = Unit

    private suspend fun capture(): PickResult {
        if (!isCameraAvailable) return PickResult.CameraUnavailable
        val file = withContext(Dispatchers.IO) { newCaptureFile() } ?: return PickResult.CameraUnavailable
        val uri = AndroidFileProvider.uriFor(context, file)
        return when (bridge.takePicture(uri)) {
            CaptureOutcome.TAKEN -> withContext(Dispatchers.IO) {
                val bytes = file.takeIf { it.length() > 0 }?.readBytes()
                file.delete()
                val picked = bytes?.let { AndroidImageCodec.compress(it, FilePickerDefaults.MAX_IMAGE_DIMENSION_PX) }
                picked?.let { PickResult.Picked(listOf(PickedFile(FilePickerDefaults.CAMERA_FILE_NAME, it.bytes, it.contentType))) }
                    ?: PickResult.Cancelled
            }
            CaptureOutcome.CANCELLED -> PickResult.Cancelled.also { file.delete() }
            CaptureOutcome.NO_CAMERA_APP -> PickResult.CameraUnavailable.also { file.delete() }
        }
    }

    private fun newCaptureFile(): File? = try {
        val dir = File(context.cacheDir, AndroidFileProvider.CAMERA_DIR).apply { mkdirs() }
        File.createTempFile(CAPTURE_PREFIX, CAPTURE_SUFFIX, dir)
    } catch (ignored: IOException) {
        null
    }

    private suspend fun read(uris: List<Uri>): PickResult {
        if (uris.isEmpty()) return PickResult.Cancelled
        val files = withContext(Dispatchers.IO) {
            val resolver = context.contentResolver
            uris.mapNotNull { uri -> readOne(resolver, uri) }
        }
        return if (files.isEmpty()) PickResult.Cancelled else PickResult.Picked(files)
    }

    private fun readOne(resolver: ContentResolver, uri: Uri): PickedFile? = try {
        val type = resolver.getType(uri)
        val name = displayName(resolver, uri)
        val bytes = resolver.openInputStream(uri)?.use { it.readBytes() }
        when {
            type == null || bytes == null -> null
            type.startsWith(IMAGE_PREFIX) -> AndroidImageCodec.compress(bytes, FilePickerDefaults.MAX_IMAGE_DIMENSION_PX)
                ?.let { PickedFile(name, it.bytes, it.contentType) }
            type.startsWith(VIDEO_PREFIX) -> PickedFile(name, bytes, type, durationMs(uri))
            else -> PickedFile(name, bytes, type)
        }
    } catch (ignored: IOException) {
        null
    } catch (ignored: SecurityException) {
        // A document provider revoked the grant before it was read; the file is skipped.
        null
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
        const val CAPTURE_PREFIX = "capture-"
        const val CAPTURE_SUFFIX = ".jpg"
    }
}

/** Crops with `Bitmap.createBitmap` after a sampled, upright decode, then compresses like the pickers. */
class AndroidImageCropper : ImageCropper {
    override suspend fun crop(bytes: ByteArray, region: CropRegion): PickedImage? = withContext(Dispatchers.Default) {
        AndroidImageCodec.cropAndCompress(bytes, region, FilePickerDefaults.MAX_IMAGE_DIMENSION_PX)
    }
}
