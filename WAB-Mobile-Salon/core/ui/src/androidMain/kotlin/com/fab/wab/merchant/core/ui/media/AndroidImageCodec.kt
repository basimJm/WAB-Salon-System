package com.fab.wab.merchant.core.ui.media

import android.graphics.Bitmap
import android.graphics.BitmapFactory
import java.io.ByteArrayOutputStream

/** Decode (sampled to stay near [maxDimension]), crop, scale and JPEG-encode images on the device. */
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
        return BitmapFactory.decodeByteArray(bytes, 0, bytes.size, BitmapFactory.Options().apply { inSampleSize = sample })
    }

    /** `inSampleSize` must be a power of two. */
    private const val SAMPLE_STEP = 2
}
