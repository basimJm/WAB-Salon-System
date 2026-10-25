package com.fab.wab.merchant.designsystem.components.upload

import androidx.compose.foundation.gestures.detectDragGesturesAfterLongPress
import androidx.compose.foundation.lazy.grid.LazyGridItemInfo
import androidx.compose.foundation.lazy.grid.LazyGridState
import androidx.compose.runtime.Composable
import androidx.compose.runtime.Stable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberUpdatedState
import androidx.compose.runtime.setValue
import androidx.compose.ui.Modifier
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.graphics.graphicsLayer
import androidx.compose.ui.input.pointer.pointerInput
import androidx.compose.ui.zIndex

private const val HALF = 0.5f
private const val LIFT_SCALE = 1.05f
private const val LIFT_Z = 1f

/** Long-press drag reordering for a lazy grid: the lifted item follows the finger and swaps with the cell under it. */
@Stable
class GridReorderState internal constructor(private val grid: LazyGridState, private val move: () -> (Int, Int) -> Unit) {
    var draggingKey: Any? by mutableStateOf(null)
        private set
    var offset: Offset by mutableStateOf(Offset.Zero)
        private set

    internal fun start(key: Any) {
        draggingKey = key
        offset = Offset.Zero
    }

    internal fun drag(delta: Offset) {
        val key = draggingKey ?: return
        offset += delta
        val items = grid.layoutInfo.visibleItemsInfo
        val current = items.firstOrNull { it.key == key } ?: return
        val center = current.center() + offset
        val target = items.firstOrNull { it.key != key && it.contains(center) } ?: return
        move()(current.index, target.index)
        offset += Offset((current.offset.x - target.offset.x).toFloat(), (current.offset.y - target.offset.y).toFloat())
    }

    internal fun end() {
        draggingKey = null
        offset = Offset.Zero
    }

    private fun LazyGridItemInfo.center() = Offset(offset.x + size.width * HALF, offset.y + size.height * HALF)

    private fun LazyGridItemInfo.contains(point: Offset): Boolean =
        point.x >= offset.x && point.x <= offset.x + size.width && point.y >= offset.y && point.y <= offset.y + size.height
}

@Composable
fun rememberGridReorderState(grid: LazyGridState, onMove: (from: Int, to: Int) -> Unit): GridReorderState {
    val currentOnMove by rememberUpdatedState(onMove)
    return remember(grid) { GridReorderState(grid) { currentOnMove } }
}

/** Makes one grid cell draggable (when [enabled]) and lifts it while it is the dragged one. */
fun Modifier.reorderable(state: GridReorderState, key: Any, enabled: Boolean): Modifier {
    if (!enabled) return this
    val lifted = state.draggingKey == key
    return this
        .zIndex(if (lifted) LIFT_Z else 0f)
        .graphicsLayer {
            if (lifted) {
                translationX = state.offset.x
                translationY = state.offset.y
                scaleX = LIFT_SCALE
                scaleY = LIFT_SCALE
            }
        }
        .pointerInput(key) {
            detectDragGesturesAfterLongPress(
                onDragStart = { state.start(key) },
                onDrag = { change, delta ->
                    change.consume()
                    state.drag(delta)
                },
                onDragEnd = { state.end() },
                onDragCancel = { state.end() },
            )
        }
}
