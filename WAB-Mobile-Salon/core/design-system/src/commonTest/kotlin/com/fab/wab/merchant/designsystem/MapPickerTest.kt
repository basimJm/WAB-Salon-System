package com.fab.wab.merchant.designsystem

import com.fab.wab.merchant.core.domain.location.MapDefaults
import com.fab.wab.merchant.designsystem.components.map.MapPickerUi
import com.fab.wab.merchant.designsystem.components.map.STYLIZED_DEGREES_PER_PX
import com.fab.wab.merchant.designsystem.components.map.panStylized
import kotlin.test.Test
import kotlin.test.assertEquals
import kotlin.test.assertFalse
import kotlin.test.assertTrue

class MapPickerTest {
    private val start = MapDefaults.DEFAULT_CENTER
    private val tolerance = 1e-9

    @Test
    fun draggingTheMapRightMovesThePointWestAndDownMovesItNorth() {
        val moved = panStylized(start, dxPx = 100f, dyPx = 50f)
        assertEquals(start.longitude - 100 * STYLIZED_DEGREES_PER_PX, moved.longitude, tolerance)
        assertEquals(start.latitude + 50 * STYLIZED_DEGREES_PER_PX, moved.latitude, tolerance)
        assertEquals(start, panStylized(start, 0f, 0f))
    }

    @Test
    fun confirmWaitsForTheAddressAndTheDeviceLocation() {
        val ready = MapPickerUi(target = start, address = "Rainbow St")
        assertTrue(ready.canConfirm)
        assertFalse(ready.copy(resolving = true).canConfirm)
        assertFalse(ready.copy(locating = true).canConfirm)
    }
}
