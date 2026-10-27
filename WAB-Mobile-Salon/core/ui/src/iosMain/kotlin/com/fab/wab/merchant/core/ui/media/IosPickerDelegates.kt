package com.fab.wab.merchant.core.ui.media

import kotlin.coroutines.resume
import kotlinx.coroutines.CompletableDeferred
import kotlinx.coroutines.suspendCancellableCoroutine
import platform.AVFoundation.AVAuthorizationStatusAuthorized
import platform.AVFoundation.AVAuthorizationStatusNotDetermined
import platform.AVFoundation.AVCaptureDevice
import platform.AVFoundation.AVMediaTypeVideo
import platform.AVFoundation.authorizationStatusForMediaType
import platform.AVFoundation.requestAccessForMediaType
import platform.Foundation.NSURL
import platform.PhotosUI.PHPickerResult
import platform.PhotosUI.PHPickerViewController
import platform.PhotosUI.PHPickerViewControllerDelegateProtocol
import platform.UIKit.UIDocumentPickerDelegateProtocol
import platform.UIKit.UIDocumentPickerViewController
import platform.UIKit.UIImage
import platform.UIKit.UIImagePickerController
import platform.UIKit.UIImagePickerControllerDelegateProtocol
import platform.UIKit.UIImagePickerControllerOriginalImage
import platform.UIKit.UINavigationControllerDelegateProtocol
import platform.darwin.NSObject

/**
 * Camera authorization before the camera opens: a refused camera shows a black viewfinder in
 * `UIImagePickerController`, so a refusal is reported (the screen offers the settings) instead.
 */
internal class IosCameraAccess {
    suspend fun ensureAccess(): Boolean = when (AVCaptureDevice.authorizationStatusForMediaType(AVMediaTypeVideo)) {
        AVAuthorizationStatusAuthorized -> true
        AVAuthorizationStatusNotDetermined -> request()
        else -> false
    }

    /** The system answers on a background queue; the continuation resumes on the caller's (main) dispatcher. */
    private suspend fun request(): Boolean = suspendCancellableCoroutine { continuation ->
        AVCaptureDevice.requestAccessForMediaType(AVMediaTypeVideo) { granted ->
            if (continuation.isActive) continuation.resume(granted)
        }
    }
}

internal class CameraDelegate(private val answer: CompletableDeferred<UIImage?>) :
    NSObject(), UIImagePickerControllerDelegateProtocol, UINavigationControllerDelegateProtocol {

    override fun imagePickerController(picker: UIImagePickerController, didFinishPickingMediaWithInfo: Map<Any?, *>) {
        answer.complete(didFinishPickingMediaWithInfo[UIImagePickerControllerOriginalImage] as? UIImage)
    }

    override fun imagePickerControllerDidCancel(picker: UIImagePickerController) {
        answer.complete(null)
    }
}

internal class DocumentDelegate(private val answer: CompletableDeferred<List<NSURL>>) : NSObject(), UIDocumentPickerDelegateProtocol {
    override fun documentPicker(controller: UIDocumentPickerViewController, didPickDocumentsAtURLs: List<*>) {
        answer.complete(didPickDocumentsAtURLs.filterIsInstance<NSURL>())
    }

    override fun documentPickerWasCancelled(controller: UIDocumentPickerViewController) {
        answer.complete(emptyList())
    }
}

internal class MediaDelegate(private val answer: CompletableDeferred<List<PHPickerResult>>) :
    NSObject(), PHPickerViewControllerDelegateProtocol {
    override fun picker(picker: PHPickerViewController, didFinishPicking: List<*>) {
        answer.complete(didFinishPicking.filterIsInstance<PHPickerResult>())
    }
}
