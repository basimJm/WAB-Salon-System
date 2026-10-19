package com.fab.wab.customer.core.ui.media

import kotlinx.cinterop.ExperimentalForeignApi
import kotlinx.cinterop.addressOf
import kotlinx.cinterop.useContents
import kotlinx.cinterop.usePinned
import kotlinx.coroutines.CompletableDeferred
import platform.CoreGraphics.CGRectMake
import platform.CoreGraphics.CGSizeMake
import platform.Foundation.NSData
import platform.UIKit.UIApplication
import platform.UIKit.UIGraphicsBeginImageContextWithOptions
import platform.UIKit.UIGraphicsEndImageContext
import platform.UIKit.UIGraphicsGetImageFromCurrentImageContext
import platform.UIKit.UIImage
import platform.UIKit.UIImageJPEGRepresentation
import platform.UIKit.UIImagePickerController
import platform.UIKit.UIImagePickerControllerDelegateProtocol
import platform.UIKit.UIImagePickerControllerOriginalImage
import platform.UIKit.UIImagePickerControllerSourceType
import platform.UIKit.UINavigationControllerDelegateProtocol
import platform.darwin.NSObject
import platform.posix.memcpy

/** `UIImagePickerController` over the key window; compresses to JPEG on the device (PRD §3.16). */
@OptIn(ExperimentalForeignApi::class)
class IosImagePicker : ImagePicker {

    override suspend fun pick(source: ImageSource): PickedImage? {
        val root = UIApplication.sharedApplication.keyWindow?.rootViewController ?: return null
        val type = when (source) {
            ImageSource.CAMERA -> UIImagePickerControllerSourceType.UIImagePickerControllerSourceTypeCamera
            ImageSource.GALLERY -> UIImagePickerControllerSourceType.UIImagePickerControllerSourceTypePhotoLibrary
        }
        if (!UIImagePickerController.isSourceTypeAvailable(type)) return null
        val answer = CompletableDeferred<UIImage?>()
        val delegate = PickerDelegate(answer)
        val picker = UIImagePickerController().apply {
            sourceType = type
            this.delegate = delegate
        }
        root.presentViewController(picker, animated = true, completion = null)
        val image = answer.await()
        picker.dismissViewControllerAnimated(true, completion = null)
        return image?.let(::compress)
    }

    private fun compress(image: UIImage): PickedImage? {
        val max = ImagePickerDefaults.MAX_DIMENSION_PX.toDouble()
        val width = image.size.useContents { width }
        val height = image.size.useContents { height }
        val scale = minOf(1.0, max / maxOf(width, height))
        val scaled = if (scale < 1.0) resize(image, width * scale, height * scale) else image
        val quality = ImagePickerDefaults.JPEG_QUALITY / PERCENT
        val data = UIImageJPEGRepresentation(scaled, quality) ?: return null
        return PickedImage(data.toByteArray(), ImagePickerDefaults.JPEG_CONTENT_TYPE)
    }

    private fun resize(image: UIImage, width: Double, height: Double): UIImage {
        UIGraphicsBeginImageContextWithOptions(CGSizeMake(width, height), false, 1.0)
        image.drawInRect(CGRectMake(0.0, 0.0, width, height))
        val result = UIGraphicsGetImageFromCurrentImageContext()
        UIGraphicsEndImageContext()
        return result ?: image
    }

    private companion object {
        const val PERCENT = 100.0
    }
}

private class PickerDelegate(private val answer: CompletableDeferred<UIImage?>) :
    NSObject(), UIImagePickerControllerDelegateProtocol, UINavigationControllerDelegateProtocol {

    override fun imagePickerController(picker: UIImagePickerController, didFinishPickingMediaWithInfo: Map<Any?, *>) {
        answer.complete(didFinishPickingMediaWithInfo[UIImagePickerControllerOriginalImage] as? UIImage)
    }

    override fun imagePickerControllerDidCancel(picker: UIImagePickerController) {
        answer.complete(null)
    }
}

@OptIn(ExperimentalForeignApi::class)
private fun NSData.toByteArray(): ByteArray {
    val size = length.toInt()
    if (size == 0) return ByteArray(0)
    return ByteArray(size).apply { usePinned { memcpy(it.addressOf(0), bytes, length) } }
}
