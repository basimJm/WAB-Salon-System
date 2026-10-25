package com.fab.wab.merchant.core.ui.alert

/** Request alert timings and platform sound ids (PRD M10). */
object RequestAlertConstants {
    /** Vibration pattern: wait, buzz, pause, buzz (milliseconds). */
    val VIBRATION_PATTERN_MS: LongArray = longArrayOf(0L, 400L, 200L, 400L)

    /** `VibrationEffect.createWaveform` repeat index meaning "play once". */
    const val NO_REPEAT = -1

    /** iOS system sounds: "sms-received1" (notification) and "alarm" (louder). */
    const val IOS_NOTIFICATION_SOUND_ID = 1007u
    const val IOS_ALARM_SOUND_ID = 1005u
}
