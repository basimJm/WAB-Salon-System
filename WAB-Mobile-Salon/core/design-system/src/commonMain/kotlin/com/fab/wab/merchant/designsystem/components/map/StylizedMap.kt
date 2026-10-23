package com.fab.wab.merchant.designsystem.components.map

import androidx.compose.foundation.Canvas
import androidx.compose.foundation.gestures.detectDragGestures
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberUpdatedState
import androidx.compose.runtime.setValue
import androidx.compose.ui.Modifier
import androidx.compose.ui.geometry.CornerRadius
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.geometry.Size
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.drawscope.DrawScope
import androidx.compose.ui.graphics.drawscope.rotate
import androidx.compose.ui.graphics.drawscope.translate
import androidx.compose.ui.input.pointer.pointerInput
import com.fab.wab.merchant.core.domain.model.LocationData
import com.fab.wab.merchant.designsystem.theme.AppTheme
import com.fab.wab.merchant.designsystem.components.map.StylizedMapConstants as S

/**
 * The design's drawn map (grid, roads, a park), used when no platform map is available (no key, previews, mock):
 * dragging moves it under the fixed pin and reports the new point on release.
 */
@Composable
internal fun StylizedMap(
    target: LocationData,
    onCenterChange: (LocationData) -> Unit,
    onMovingChange: (Boolean) -> Unit,
    modifier: Modifier = Modifier,
) {
    var drag by remember { mutableStateOf(Offset.Zero) }
    val currentTarget by rememberUpdatedState(target)
    val currentOnCenter by rememberUpdatedState(onCenterChange)
    val currentOnMoving by rememberUpdatedState(onMovingChange)
    val colors = AppTheme.colors
    val sizes = AppTheme.sizes
    Canvas(
        modifier = modifier.pointerInput(Unit) {
            detectDragGestures(
                onDragStart = { currentOnMoving(true) },
                onDrag = { change, amount ->
                    change.consume()
                    drag += amount
                },
                onDragEnd = {
                    currentOnCenter(panStylized(currentTarget, drag.x, drag.y))
                    drag = Offset.Zero
                    currentOnMoving(false)
                },
                onDragCancel = {
                    drag = Offset.Zero
                    currentOnMoving(false)
                },
            )
        },
    ) {
        drawRect(colors.mapBackground)
        val cell = sizes.mapGridCell.toPx()
        translate(drag.x % cell, drag.y % cell) { drawGrid(cell, colors.mapGrid) }
        translate(drag.x, drag.y) {
            drawPark(cell, colors.successContainer)
            drawRoads(sizes.mapRoadWide.toPx(), sizes.mapRoadNarrow.toPx(), colors.mapRoad)
        }
    }
}

private fun DrawScope.drawGrid(cell: Float, color: Color) {
    var x = -cell
    while (x <= size.width + cell) {
        drawLine(color, Offset(x, -cell), Offset(x, size.height + cell))
        x += cell
    }
    var y = -cell
    while (y <= size.height + cell) {
        drawLine(color, Offset(-cell, y), Offset(size.width + cell, y))
        y += cell
    }
}

private fun DrawScope.drawPark(cell: Float, color: Color) {
    drawRoundRect(
        color = color,
        topLeft = Offset(size.width * S.PARK_START, size.height * S.PARK_TOP),
        size = Size(cell * S.PARK_WIDTH_CELLS, cell * S.PARK_HEIGHT_CELLS),
        cornerRadius = CornerRadius(cell * S.PARK_CORNER_CELLS),
    )
}

private fun DrawScope.drawRoads(wide: Float, narrow: Float, color: Color) {
    val overW = size.width * S.OVERSHOOT
    val overH = size.height * S.OVERSHOOT
    rotate(S.ROAD_A_ANGLE) { drawRect(color, Offset(-overW, size.height * S.ROAD_A_TOP), Size(size.width + overW * S.BOTH_SIDES, wide)) }
    rotate(S.ROAD_B_ANGLE) { drawRect(color, Offset(-overW, size.height * S.ROAD_B_TOP), Size(size.width + overW * S.BOTH_SIDES, narrow)) }
    rotate(S.ROAD_C_ANGLE) { drawRect(color, Offset(size.width * S.ROAD_C_START, -overH), Size(wide, size.height + overH * S.BOTH_SIDES)) }
    rotate(S.ROAD_D_ANGLE) {
        drawRect(color, Offset(size.width * S.ROAD_D_START, -overH), Size(narrow, size.height + overH * S.BOTH_SIDES))
    }
}
