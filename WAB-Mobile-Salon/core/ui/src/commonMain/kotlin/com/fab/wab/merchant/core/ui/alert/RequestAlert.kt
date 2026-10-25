package com.fab.wab.merchant.core.ui.alert

import org.koin.core.module.Module
import org.koin.dsl.module

/** Which tone a new booking request plays (PRD M10: "the request sound is configurable"). */
enum class RequestAlertSound {
    /** The device notification tone. */
    NOTIFICATION,

    /** The louder alarm tone, for salons that need to hear requests across the room. */
    ALARM,

    /** Vibration only. */
    SILENT,
    ;

    companion object {
        val DEFAULT = NOTIFICATION

        fun fromCode(code: String?): RequestAlertSound = entries.firstOrNull { it.name == code } ?: DEFAULT
    }
}

/**
 * Sound + vibration hook for the real-time request sheet (PRD M10, Design Script §1.2 "distinct sound/vibration").
 * The in-app sheet calls [play] when a request is shown and [stop] when it is answered, handled elsewhere or closed.
 */
interface RequestAlert {
    fun play(sound: RequestAlertSound = RequestAlertSound.DEFAULT, vibrate: Boolean = true)

    fun stop()
}

/** For previews, tests and platforms without an alert. */
object SilentRequestAlert : RequestAlert {
    override fun play(sound: RequestAlertSound, vibrate: Boolean) = Unit

    override fun stop() = Unit
}

/** Binds the platform [RequestAlert]. */
expect val platformRequestAlertModule: Module

val requestAlertModule = module { includes(platformRequestAlertModule) }
