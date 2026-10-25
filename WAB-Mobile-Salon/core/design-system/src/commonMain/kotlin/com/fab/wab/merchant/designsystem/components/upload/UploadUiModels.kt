package com.fab.wab.merchant.designsystem.components.upload

import androidx.compose.runtime.Immutable
import com.fab.wab.merchant.core.domain.upload.UploadKind
import com.fab.wab.merchant.core.ui.media.CropRegion
import kotlin.math.roundToInt

/** Local bytes shown before the CDN URL exists; compared by identity (no deep array equality in state). */
class LocalPreview(val bytes: ByteArray)

/** Where an upload stands (Design Script §1.2 upload tile: uploading / uploaded / failed). */
@Immutable
sealed interface UploadStatus {
    data class Uploading(val progress: Float) : UploadStatus
    data object Uploaded : UploadStatus
    data object Failed : UploadStatus
}

/** One file in an uploader or the media grid; [sizeText] / [durationMs] are optional captions. */
@Immutable
data class UploadItemUi(
    val id: String,
    val name: String,
    val kind: UploadKind,
    val status: UploadStatus,
    val preview: LocalPreview? = null,
    val url: String? = null,
    val sizeText: String? = null,
    val durationMs: Long? = null,
) {
    val isRemovable: Boolean get() = status !is UploadStatus.Uploading
}

/** Crop frames of design 05 Salon: cover 16:9, profile / logo 1:1. */
enum class CropAspect(val ratio: Float) {
    WIDE(WIDE_RATIO),
    SQUARE(1f),
}

private const val WIDE_RATIO = 16f / 9f
private const val HALF = 0.5f
private const val PERCENT = 100

/** Whole percent for the progress caption, clamped to 0..100. */
fun uploadPercent(progress: Float): Int = (progress.coerceIn(0f, 1f) * PERCENT).roundToInt()

/** "m:ss" parts of a video duration (minutes, two-digit seconds), rounded down. */
fun durationParts(durationMs: Long): Pair<Int, String> {
    val totalSeconds = (durationMs.coerceAtLeast(0L) / MILLIS_PER_SECOND).toInt()
    return totalSeconds / SECONDS_PER_MINUTE to (totalSeconds % SECONDS_PER_MINUTE).toString().padStart(SECONDS_DIGITS, ZERO)
}

private const val MILLIS_PER_SECOND = 1000L
private const val SECONDS_PER_MINUTE = 60
private const val ZERO = '0'
private const val SECONDS_DIGITS = 2

/** [list] with the element at [from] moved to [to] (indices clamped); the same list when nothing moves. */
fun <T> moveItem(list: List<T>, from: Int, to: Int): List<T> {
    if (from !in list.indices) return list
    val target = to.coerceIn(0, list.lastIndex)
    if (from == target) return list
    return list.toMutableList().apply { add(target, removeAt(from)) }
}

/**
 * Pan/zoom state of the cropper: [zoom] ≥ 1 over a "fill the frame" fit, [centerX]/[centerY] = the frame centre in
 * normalized image coordinates. [region] turns it into the crop rectangle sent to `ImageCropper`.
 */
@Immutable
data class CropState(val zoom: Float = 1f, val centerX: Float = HALF, val centerY: Float = HALF) {

    /** Visible part of the image (fractions) for an image of [imageAspect] in a frame of [frameAspect]. */
    fun region(imageAspect: Float, frameAspect: Float): CropRegion {
        val (width, height) = visibleFraction(imageAspect, frameAspect)
        return CropRegion(centerX - width * HALF, centerY - height * HALF, width, height)
    }

    /** Drag by a fraction of the frame size (finger moves right → image moves right → centre moves left). */
    fun pan(dxFrame: Float, dyFrame: Float, imageAspect: Float, frameAspect: Float): CropState {
        val (width, height) = visibleFraction(imageAspect, frameAspect)
        return copy(centerX = centerX - dxFrame * width, centerY = centerY - dyFrame * height).clamped(imageAspect, frameAspect)
    }

    fun zoomTo(value: Float, imageAspect: Float, frameAspect: Float): CropState =
        copy(zoom = value.coerceIn(1f, MAX_ZOOM)).clamped(imageAspect, frameAspect)

    private fun visibleFraction(imageAspect: Float, frameAspect: Float): Pair<Float, Float> {
        val fill = if (imageAspect > frameAspect) (frameAspect / imageAspect) to 1f else 1f to (imageAspect / frameAspect)
        return fill.first / zoom to fill.second / zoom
    }

    private fun clamped(imageAspect: Float, frameAspect: Float): CropState {
        val (width, height) = visibleFraction(imageAspect, frameAspect)
        return copy(
            centerX = centerX.coerceIn(width * HALF, 1f - width * HALF),
            centerY = centerY.coerceIn(height * HALF, 1f - height * HALF),
        )
    }

    companion object {
        const val MAX_ZOOM = 3f
    }
}
