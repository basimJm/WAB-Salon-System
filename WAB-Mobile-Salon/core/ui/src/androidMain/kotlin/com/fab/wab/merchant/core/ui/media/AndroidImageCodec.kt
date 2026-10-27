package com.fab.wab.merchant.core.ui.media

import android.graphics.Bitmap
import android.graphics.BitmapFactory
import android.graphics.Matrix
import android.media.ExifInterface
import java.io.ByteArrayInputStream
import java.io.ByteArrayOutputStream
import java.io.IOException

/**
 * Decode (sampled to stay near [maxDimension]), turn upright, crop, scale and JPEG-encode images on the device.
 * Camera photos and most library photos are stored sideways with an EXIF orientation tag; the decoded bitmap
 * ignores it, so it is applied here before cropping (the cropper shows what the user saw in the gallery).
 */
internal object AndroidImageCodec {
    fun compress(bytes: ByteArray, maxDimension: Int): PickedImage? = decode(bytes, maxDimension)?.let { encode(it, maxDimension) }

    fun cropAndCompress(bytes: ByteArray, region: CropRegion, maxDimension: Int): PickedImage? {
        val source = decode(bytes, maxDimension) ?: return null
        val left = (region.left * source.width).toInt().coerceIn(0, source.width - 1)
        val top = (region.top * source.height).toInt().coerceIn(0, source.height - 1)
        val width = (region.width * source.width).toInt().coerceIn(1, source.width - left)
        val height = (region.height * source.height).toInt().coerceIn(1, source.height - top)
        return encode(Bitmap.createBitmap(source, left, top, width, height), maxDimension)
    }

    fun encode(bitmap: Bitmap, maxDimension: Int): PickedImage {
        val scale = minOf(1f, maxDimension.toFloat() / maxOf(bitmap.width, bitmap.height))
        val scaled = if (scale < 1f) {
            Bitmap.createScaledBitmap(bitmap, (bitmap.width * scale).toInt(), (bitmap.height * scale).toInt(), true)
        } else {
            bitmap
        }
        val out = ByteArrayOutputStream()
        scaled.compress(Bitmap.CompressFormat.JPEG, ImagePickerDefaults.JPEG_QUALITY, out)
        return PickedImage(out.toByteArray(), ImagePickerDefaults.JPEG_CONTENT_TYPE)
    }

    private fun decode(bytes: ByteArray, maxDimension: Int): Bitmap? {
        val bounds = BitmapFactory.Options().apply { inJustDecodeBounds = true }
        BitmapFactory.decodeByteArray(bytes, 0, bytes.size, bounds)
        var sample = 1
        while (maxOf(bounds.outWidth, bounds.outHeight) / (sample * SAMPLE_STEP) >= maxDimension) sample *= SAMPLE_STEP
        val bitmap = BitmapFactory.decodeByteArray(bytes, 0, bytes.size, BitmapFactory.Options().apply { inSampleSize = sample })
            ?: return null
        return upright(bitmap, orientationOf(bytes))
    }

    private fun orientationOf(bytes: ByteArray): Int = try {
        ExifInterface(ByteArrayInputStream(bytes)).getAttributeInt(ExifInterface.TAG_ORIENTATION, ExifInterface.ORIENTATION_NORMAL)
    } catch (ignored: IOException) {
        ExifInterface.ORIENTATION_NORMAL
    }

    private fun upright(bitmap: Bitmap, orientation: Int): Bitmap {
        val matrix = Matrix()
        when (orientation) {
            ExifInterface.ORIENTATION_ROTATE_90 -> matrix.postRotate(QUARTER_TURN)
            ExifInterface.ORIENTATION_ROTATE_180 -> matrix.postRotate(HALF_TURN)
            ExifInterface.ORIENTATION_ROTATE_270 -> matrix.postRotate(THREE_QUARTER_TURN)
            ExifInterface.ORIENTATION_FLIP_HORIZONTAL -> matrix.postScale(MIRROR, 1f)
            ExifInterface.ORIENTATION_FLIP_VERTICAL -> matrix.postScale(1f, MIRROR)
            ExifInterface.ORIENTATION_TRANSPOSE -> matrix.apply { postRotate(QUARTER_TURN); postScale(MIRROR, 1f) }
            ExifInterface.ORIENTATION_TRANSVERSE -> matrix.apply { postRotate(THREE_QUARTER_TURN); postScale(MIRROR, 1f) }
            else -> return bitmap
        }
        return Bitmap.createBitmap(bitmap, 0, 0, bitmap.width, bitmap.height, matrix, true)
    }

    /** `inSampleSize` must be a power of two. */
    private const val SAMPLE_STEP = 2
    private const val QUARTER_TURN = 90f
    private const val HALF_TURN = 180f
    private const val THREE_QUARTER_TURN = 270f
    private const val MIRROR = -1f
}
