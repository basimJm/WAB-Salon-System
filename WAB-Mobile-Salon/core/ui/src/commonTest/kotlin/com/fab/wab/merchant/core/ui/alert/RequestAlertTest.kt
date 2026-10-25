package com.fab.wab.merchant.core.ui.alert

import kotlin.test.Test
import kotlin.test.assertEquals

class RequestAlertTest {
    @Test
    fun storedSoundCodesFallBackToTheNotificationTone() {
        assertEquals(RequestAlertSound.ALARM, RequestAlertSound.fromCode("ALARM"))
        assertEquals(RequestAlertSound.SILENT, RequestAlertSound.fromCode("SILENT"))
        assertEquals(RequestAlertSound.NOTIFICATION, RequestAlertSound.fromCode(null))
        assertEquals(RequestAlertSound.NOTIFICATION, RequestAlertSound.fromCode("LOUD"))
    }

    @Test
    fun vibrationPatternStartsImmediatelyAndPlaysOnce() {
        assertEquals(0L, RequestAlertConstants.VIBRATION_PATTERN_MS.first())
        assertEquals(-1, RequestAlertConstants.NO_REPEAT)
    }
}
