package com.fab.wab.customer.firebase

import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.media.RingtoneManager
import androidx.core.app.NotificationCompat
import com.fab.wab.customer.R
import com.fab.wab.customer.core.domain.AppSettings
import com.fab.wab.customer.core.firebase.PushTokenRelay
import com.fab.wab.customer.core.notification.push.PushKeys
import com.fab.wab.customer.core.notification.push.PushNotification
import com.fab.wab.customer.core.notification.push.PushSignals
import com.fab.wab.customer.core.notification.push.pushNotificationOf
import com.google.firebase.messaging.FirebaseMessagingService
import com.google.firebase.messaging.RemoteMessage
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.launch
import org.koin.java.KoinJavaComponent

/**
 * PRD §10.2: refreshed tokens go to the installation syncer; a message shown while the app is in the foreground
 * becomes an in-app banner, otherwise a system notification whose tap opens the app on S19.
 */
class MyFirebaseMessagingService : FirebaseMessagingService() {

    private val appSettings: AppSettings by lazy { KoinJavaComponent.getKoin().get() }

    override fun onNewToken(token: String) {
        super.onNewToken(token)
        PushTokenRelay.publish(token)
        CoroutineScope(Dispatchers.IO).launch { appSettings.setFcmToken(token) }
    }

    override fun onMessageReceived(remoteMessage: RemoteMessage) {
        super.onMessageReceived(remoteMessage)
        val push = pushNotificationOf(remoteMessage.data, remoteMessage.notification?.title, remoteMessage.notification?.body) ?: return
        if (PushSignals.appForeground.value) PushSignals.publishReceived(push) else showSystemNotification(push)
    }

    private fun showSystemNotification(push: PushNotification) {
        val manager = getSystemService(NOTIFICATION_SERVICE) as NotificationManager
        manager.createNotificationChannel(
            NotificationChannel(CHANNEL_ID, getString(R.string.push_channel_name), NotificationManager.IMPORTANCE_HIGH),
        )
        val tap = PendingIntent.getActivity(
            this,
            push.requestCode(),
            PushIntents.toActivity(this, push),
            PendingIntent.FLAG_IMMUTABLE or PendingIntent.FLAG_UPDATE_CURRENT,
        )
        val notification = NotificationCompat.Builder(this, CHANNEL_ID)
            .setContentTitle(push.title)
            .setContentText(push.message)
            .setStyle(NotificationCompat.BigTextStyle().bigText(push.message))
            .setSmallIcon(R.mipmap.ic_launcher_foreground)
            .setPriority(NotificationCompat.PRIORITY_HIGH)
            .setAutoCancel(true)
            .setSound(RingtoneManager.getDefaultUri(RingtoneManager.TYPE_NOTIFICATION))
            .setContentIntent(tap)
            .build()
        manager.notify(push.requestCode(), notification)
    }

    /** One system entry per server notification; unknown ids collapse on the whole payload. */
    private fun PushNotification.requestCode(): Int = (data[PushKeys.NOTIFICATION_ID] ?: "$title$message").hashCode()

    private companion object {
        const val CHANNEL_ID = "wab_notifications"
    }
}
