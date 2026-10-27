package com.fab.wab.merchant.core.ui.media

import android.app.Activity
import android.content.ActivityNotFoundException
import android.content.Context
import android.net.Uri
import androidx.activity.ComponentActivity
import androidx.activity.result.ActivityResultLauncher
import androidx.activity.result.PickVisualMediaRequest
import androidx.activity.result.contract.ActivityResultContracts
import androidx.core.content.FileProvider
import java.io.File
import kotlinx.coroutines.CompletableDeferred

/** How a camera hand-off ended. */
enum class CaptureOutcome { TAKEN, CANCELLED, NO_CAMERA_APP }

/**
 * Activity-bound launchers (attached by MainActivity); one request at a time. The bridge is a singleton, so a
 * request survives the activity being recreated while the picker or the camera app is in front (rotation, or the
 * system reclaiming the activity behind a heavy camera app): the new activity registers the same launchers and the
 * Activity Result API delivers the answer to them. Only an activity that really finishes drops the request.
 */
class AndroidFilePickerBridge {
    private var documents: ActivityResultLauncher<Array<String>>? = null
    private var single: ActivityResultLauncher<PickVisualMediaRequest>? = null
    private var multiple: ActivityResultLauncher<PickVisualMediaRequest>? = null
    private var camera: ActivityResultLauncher<Uri>? = null
    private var pendingUris: CompletableDeferred<List<Uri>>? = null
    private var pendingCapture: CompletableDeferred<Boolean>? = null

    fun attach(activity: ComponentActivity) {
        documents = activity.registerForActivityResult(ActivityResultContracts.OpenMultipleDocuments()) { completeUris(it) }
        single = activity.registerForActivityResult(ActivityResultContracts.PickVisualMedia()) { completeUris(listOfNotNull(it)) }
        multiple = activity.registerForActivityResult(ActivityResultContracts.PickMultipleVisualMedia(AndroidPickerLimits.MEDIA_MAX)) {
            completeUris(it)
        }
        camera = activity.registerForActivityResult(ActivityResultContracts.TakePicture()) { taken ->
            pendingCapture?.complete(taken)
            pendingCapture = null
        }
    }

    fun detach(activity: Activity) {
        listOf(documents, single, multiple, camera).forEach { it?.unregister() }
        documents = null
        single = null
        multiple = null
        camera = null
        if (activity.isFinishing && !activity.isChangingConfigurations) {
            pendingUris?.complete(emptyList())
            pendingCapture?.complete(false)
            pendingUris = null
            pendingCapture = null
        }
    }

    suspend fun pickDocuments(): List<Uri> = awaitUris { documents?.launch(DOCUMENT_TYPES) }

    suspend fun pickMedia(maxCount: Int, includeVideo: Boolean): List<Uri> {
        val type = if (includeVideo) {
            ActivityResultContracts.PickVisualMedia.ImageAndVideo
        } else {
            ActivityResultContracts.PickVisualMedia.ImageOnly
        }
        val launcher = if (maxCount > 1) multiple else single
        return awaitUris { launcher?.launch(PickVisualMediaRequest(type)) }
    }

    suspend fun takePicture(output: Uri): CaptureOutcome {
        val launcher = camera ?: return CaptureOutcome.NO_CAMERA_APP
        pendingCapture?.complete(false)
        val answer = CompletableDeferred<Boolean>()
        pendingCapture = answer
        return try {
            launcher.launch(output)
            if (answer.await()) CaptureOutcome.TAKEN else CaptureOutcome.CANCELLED
        } catch (ignored: ActivityNotFoundException) {
            pendingCapture = null
            CaptureOutcome.NO_CAMERA_APP
        }
    }

    /** [start] returns null when no activity is attached; a missing system picker answers an empty list. */
    private suspend fun awaitUris(start: () -> Unit?): List<Uri> {
        pendingUris?.complete(emptyList())
        val answer = CompletableDeferred<List<Uri>>()
        pendingUris = answer
        return try {
            if (start() == null) {
                pendingUris = null
                emptyList()
            } else {
                answer.await()
            }
        } catch (ignored: ActivityNotFoundException) {
            pendingUris = null
            emptyList()
        }
    }

    private fun completeUris(uris: List<Uri>) {
        pendingUris?.complete(uris)
        pendingUris = null
    }

    private companion object {
        const val ANY_SUBTYPE = "*"
        const val IMAGE_TYPE = "image"
        val DOCUMENT_TYPES = arrayOf(FilePickerDefaults.PDF_CONTENT_TYPE, "$IMAGE_TYPE/$ANY_SUBTYPE")
    }
}

/** The app's FileProvider (declared in the app manifest with `@xml/file_paths`): camera output in the cache. */
internal object AndroidFileProvider {
    const val CAMERA_DIR = "camera"
    private const val AUTHORITY_SUFFIX = ".fileprovider"

    fun uriFor(context: Context, file: File): Uri = FileProvider.getUriForFile(context, context.packageName + AUTHORITY_SUFFIX, file)
}

internal object AndroidPickerLimits {
    /** Registration-time cap of the system photo picker; callers trim to their own maximum. */
    const val MEDIA_MAX = 20
}
