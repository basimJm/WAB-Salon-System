package com.fab.wab.merchant.core.ui.media

import android.graphics.Bitmap
import android.graphics.BitmapFactory
import android.net.Uri
import androidx.activity.ComponentActivity
import androidx.activity.result.ActivityResultLauncher
import androidx.activity.result.PickVisualMediaRequest
import androidx.activity.result.contract.ActivityResultContracts
import com.fab.wab.merchant.core.ui.permission.AndroidPermissionBridge
import java.io.ByteArrayOutputStream
import kotlinx.coroutines.CompletableDeferred
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext

/** Activity-bound launchers (attached by MainActivity like [AndroidPermissionBridge]); one request at a time. */
class AndroidImagePickerBridge {
    private var gallery: ActivityResultLauncher<PickVisualMediaRequest>? = null
    private var camera: ActivityResultLauncher<Void?>? = null
    private var pendingUri: CompletableDeferred<Uri?>? = null
    private var pendingBitmap: CompletableDeferred<Bitmap?>? = null

    fun attach(activity: ComponentActivity) {
        gallery = activity.registerForActivityResult(ActivityResultContracts.PickVisualMedia()) { uri ->
            pendingUri?.complete(uri)
            pendingUri = null
        }
        camera = activity.registerForActivityResult(ActivityResultContracts.TakePicturePreview()) { bitmap ->
            pendingBitmap?.complete(bitmap)
            pendingBitmap = null
        }
    }

    fun detach() {
        gallery?.unregister()
        camera?.unregister()
        gallery = null
        camera = null
        pendingUri?.cancel()
        pendingBitmap?.cancel()
    }

    suspend fun pickFromGallery(): Uri? {
        val launcher = gallery ?: return null
        val answer = CompletableDeferred<Uri?>()
        pendingUri = answer
        launcher.launch(PickVisualMediaRequest(ActivityResultContracts.PickVisualMedia.ImageOnly))
        return answer.await()
    }

    suspend fun takePicture(): Bitmap? {
        val launcher = camera ?: return null
        val answer = CompletableDeferred<Bitmap?>()
        pendingBitmap = answer
        launcher.launch(null)
        return answer.await()
    }
}

class AndroidImagePicker(
    private val bridge: AndroidImagePickerBridge,
    private val permissions: AndroidPermissionBridge,
) : ImagePicker {

    override suspend fun pick(source: ImageSource): PickedImage? {
        val bitmap = when (source) {
            ImageSource.GALLERY -> bridge.pickFromGallery()?.let(::decode)
            ImageSource.CAMERA -> bridge.takePicture()
        } ?: return null
        return withContext(Dispatchers.Default) { compress(bitmap) }
    }

    private fun decode(uri: Uri): Bitmap? {
        val resolver = permissions.activity?.contentResolver ?: return null
        return resolver.openInputStream(uri)?.use { BitmapFactory.decodeStream(it) }
    }

    private fun compress(bitmap: Bitmap): PickedImage {
        val max = ImagePickerDefaults.MAX_DIMENSION_PX
        val scale = minOf(1f, max.toFloat() / maxOf(bitmap.width, bitmap.height))
        val scaled = if (scale < 1f) {
            Bitmap.createScaledBitmap(bitmap, (bitmap.width * scale).toInt(), (bitmap.height * scale).toInt(), true)
        } else {
            bitmap
        }
        val out = ByteArrayOutputStream()
        scaled.compress(Bitmap.CompressFormat.JPEG, ImagePickerDefaults.JPEG_QUALITY, out)
        return PickedImage(out.toByteArray(), ImagePickerDefaults.JPEG_CONTENT_TYPE)
    }
}
