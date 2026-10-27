package com.fab.wab.merchant.core.ui.alert

import android.content.Context
import android.media.Ringtone
import android.media.RingtoneManager
import android.os.Build
import android.os.VibrationEffect
import android.os.Vibrator
import android.os.VibratorManager
import java.util.concurrent.Executor
import java.util.concurrent.Executors
import org.koin.core.module.Module
import org.koin.dsl.module

/**
 * Plays the system notification / alarm tone and a short vibration pattern for a new booking request.
 *
 * MER-079 (Perfetto): `RingtoneManager.getRingtone` + `play` create a MediaPlayer through binder calls (up to 11 ms on
 * the main thread per request, every time the request sheet moves to the next request). The work now runs on one
 * background thread, in call order, so a `stop` always lands after the `play` it follows.
 */
class AndroidRequestAlert(
    private val context: Context,
    private val worker: Executor = Executors.newSingleThreadExecutor(),
) : RequestAlert {
    private var ringtone: Ringtone? = null

    override fun play(sound: RequestAlertSound, vibrate: Boolean) = worker.execute { playNow(sound, vibrate) }

    override fun stop() = worker.execute { stopNow() }

    private fun playNow(sound: RequestAlertSound, vibrate: Boolean) {
        stopNow()
        if (sound != RequestAlertSound.SILENT) {
            val type = if (sound == RequestAlertSound.ALARM) RingtoneManager.TYPE_ALARM else RingtoneManager.TYPE_NOTIFICATION
            ringtone = RingtoneManager.getRingtone(context, RingtoneManager.getDefaultUri(type))?.also { it.play() }
        }
        if (vibrate) {
            vibrator()?.vibrate(VibrationEffect.createWaveform(RequestAlertConstants.VIBRATION_PATTERN_MS, RequestAlertConstants.NO_REPEAT))
        }
    }

    private fun stopNow() {
        ringtone?.stop()
        ringtone = null
        vibrator()?.cancel()
    }

    private fun vibrator(): Vibrator? = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
        context.getSystemService(VibratorManager::class.java)?.defaultVibrator
    } else {
        context.getSystemService(Vibrator::class.java)
    }
}

actual val platformRequestAlertModule: Module = module {
    single<RequestAlert> { AndroidRequestAlert(get<Context>()) }
}
