package com.fab.wab.merchant.designsystem

import androidx.compose.ui.graphics.Color
import androidx.compose.ui.unit.dp
import com.fab.wab.merchant.designsystem.theme.DarkColors
import com.fab.wab.merchant.designsystem.theme.DefaultSurfaces
import com.fab.wab.merchant.designsystem.theme.LightColors
import com.fab.wab.merchant.designsystem.theme.SurfaceTone
import com.fab.wab.merchant.designsystem.theme.surfaceTokensFor
import kotlin.test.Test
import kotlin.test.assertEquals
import kotlin.test.assertTrue

/** MER-074: the merchant surfaces are the design's flat `tv()` colours (no Liquid Glass, owner decision 2026-10-26). */
class SurfaceTokensTest {

    @Test
    fun fillsAreTheDesignColoursPerTone() {
        val light = surfaceTokensFor(LightColors)
        assertEquals(Color(0xFFFFFFFF), light.fill(SurfaceTone.Card), "--card light")
        assertEquals(Color(0xFFF8F7FB), light.fill(SurfaceTone.Surface), "--surface light")
        assertEquals(Color(0xFFF3EEFB), light.fill(SurfaceTone.Soft), "--soft light")
        assertEquals(Color(0xFFEEEAF4), light.line, "--line light")
        val dark = surfaceTokensFor(DarkColors)
        assertEquals(Color(0xFF1C1F37), dark.fill(SurfaceTone.Card), "--card dark")
        assertEquals(Color(0xFF1F2340), dark.fill(SurfaceTone.Surface), "--surface dark")
        assertEquals(Color(0xFF2C2553), dark.fill(SurfaceTone.Soft), "--soft dark")
    }

    @Test
    fun surfacesAreOpaqueWithAHairlineEdgeAndAThickerStateBorder() {
        listOf(surfaceTokensFor(LightColors), surfaceTokensFor(DarkColors)).forEach { t ->
            SurfaceTone.entries.forEach { tone -> assertEquals(1f, t.fill(tone).alpha, "flat, not see-through: $tone") }
            assertEquals(1.dp, t.lineWidth)
            assertTrue(t.stateBorderWidth > t.lineWidth, "error / focus / selection borders stand out (1.5 dp)")
        }
        assertEquals(surfaceTokensFor(LightColors), DefaultSurfaces)
    }
}
