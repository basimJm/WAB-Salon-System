package com.fab.wab.merchant.designsystem

import com.fab.wab.merchant.designsystem.components.brand.logoAnimationSpeed
import com.fab.wab.merchant.designsystem.theme.DefaultMotion
import kotlin.test.Test
import kotlin.test.assertEquals
import kotlin.time.Duration
import kotlin.time.Duration.Companion.milliseconds

class AnimatedLogoTest {
    @Test
    fun theOwnersFileOf6500MsPlaysInTheLogoRevealToken() {
        val target = DefaultMotion.logoReveal.milliseconds
        assertEquals(6500f / DefaultMotion.logoReveal, logoAnimationSpeed(6500.milliseconds, target))
        assertEquals(6.5f, logoAnimationSpeed(6500.milliseconds, 1000.milliseconds))
    }

    @Test
    fun aShorterFileIsSlowedDownToTheSameLength() {
        assertEquals(0.5f, logoAnimationSpeed(500.milliseconds, 1000.milliseconds))
    }

    @Test
    fun nonPositiveLengthsPlayAsAuthored() {
        assertEquals(1f, logoAnimationSpeed(Duration.ZERO, 1000.milliseconds))
        assertEquals(1f, logoAnimationSpeed(6500.milliseconds, Duration.ZERO))
    }
}
