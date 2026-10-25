package com.fab.wab.merchant.core.ui.media

import kotlinx.cinterop.BetaInteropApi
import kotlinx.cinterop.ExperimentalForeignApi
import kotlinx.cinterop.addressOf
import kotlinx.cinterop.useContents
import kotlinx.cinterop.usePinned
import platform.CoreGraphics.CGImageCreateWithImageInRect
import platform.CoreGraphics.CGRectMake
import platform.CoreGraphics.CGSizeMake
import platform.Foundation.NSData
import platform.Foundation.create
import platform.UIKit.UIGraphicsBeginImageContextWithOptions
import platform.UIKit.UIGraphicsEndImageContext
import platform.UIKit.UIGraphicsGetImageFromCurrentImageContext
import platform.UIKit.UIImage
import platform.UIKit.UIImageJPEGRepresentation
import platform.posix.memcpy

/** Redraw (fixes the EXIF orientation), crop, scale and JPEG-encode on the device. */
@OptIn(ExperimentalForeignApi::class)
internal object IosImageCodec {
    private const val PERCENT = 100.0

    fun encode(image: UIImage, maxDimension: Int): PickedImage? {
        val (width, height) = sizeOf(image)
        val scale = minOf(1.0, maxDimension / maxOf(width, height))
        val drawn = redraw(image, width * scale, height * scale)
        val data = UIImageJPEGRepresentation(drawn, ImagePickerDefaults.JPEG_QUALITY / PERCENT) ?: return null
        return PickedImage(data.toByteArray(), ImagePickerDefaults.JPEG_CONTENT_TYPE)
    }

    fun cropAndEncode(bytes: ByteArray, region: CropRegion, maxDimension: Int): PickedImage? {
        val source = UIImage.imageWithData(bytes.toNSData()) ?: return null
        val (width, height) = sizeOf(source)
        val upright = redraw(source, width, height)
        val cgImage = upright.CGImage ?: return null
        val pixelScale = upright.scale
        val rect = CGRectMake(
            region.left * width * pixelScale,
            region.top * height * pixelScale,
            region.width * width * pixelScale,
            region.height * height * pixelScale,
        )
        val cropped = CGImageCreateWithImageInRect(cgImage, rect) ?: return null
        return encode(UIImage.imageWithCGImage(cropped), maxDimension)
    }

    private fun sizeOf(image: UIImage): Pair<Double, Double> = image.size.useContents { width to height }

    private fun redraw(image: UIImage, width: Double, height: Double): UIImage {
        UIGraphicsBeginImageContextWithOptions(CGSizeMake(width, height), false, 1.0)
        image.drawInRect(CGRectMake(0.0, 0.0, width, height))
        val result = UIGraphicsGetImageFromCurrentImageContext()
        UIGraphicsEndImageContext()
        return result ?: image
    }
}

@OptIn(ExperimentalForeignApi::class)
internal fun NSData.toByteArray(): ByteArray {
    val size = length.toInt()
    if (size == 0) return ByteArray(0)
    return ByteArray(size).apply { usePinned { memcpy(it.addressOf(0), bytes, length) } }
}

@OptIn(ExperimentalForeignApi::class, BetaInteropApi::class)
internal fun ByteArray.toNSData(): NSData = usePinned { NSData.create(bytes = it.addressOf(0), length = size.toULong()) }
