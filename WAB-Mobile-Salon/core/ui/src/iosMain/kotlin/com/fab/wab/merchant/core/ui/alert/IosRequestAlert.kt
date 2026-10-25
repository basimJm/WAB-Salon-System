package com.fab.wab.merchant.core.ui.alert

import org.koin.core.module.Module
import org.koin.dsl.module
import platform.AudioToolbox.AudioServicesPlaySystemSound
import platform.AudioToolbox.kSystemSoundID_Vibrate

/** System sound + vibration for a new booking request; system sounds are short, so [stop] has nothing to cancel. */
class IosRequestAlert : RequestAlert {
    override fun play(sound: RequestAlertSound, vibrate: Boolean) {
        when (sound) {
            RequestAlertSound.NOTIFICATION -> AudioServicesPlaySystemSound(RequestAlertConstants.IOS_NOTIFICATION_SOUND_ID)
            RequestAlertSound.ALARM -> AudioServicesPlaySystemSound(RequestAlertConstants.IOS_ALARM_SOUND_ID)
            RequestAlertSound.SILENT -> Unit
        }
        if (vibrate) AudioServicesPlaySystemSound(kSystemSoundID_Vibrate)
    }

    override fun stop() = Unit
}

actual val platformRequestAlertModule: Module = module {
    single<RequestAlert> { IosRequestAlert() }
}
