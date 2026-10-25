package com.fab.wab.merchant.app.request

import android.app.Notification
import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.content.Context
import android.content.Intent
import android.media.AudioAttributes
import android.media.RingtoneManager
import androidx.core.app.NotificationCompat
import com.fab.wab.merchant.app.resources.Res
import com.fab.wab.merchant.app.resources.request_accept
import com.fab.wab.merchant.app.resources.request_body
import com.fab.wab.merchant.app.resources.request_channel
import com.fab.wab.merchant.app.resources.request_reject
import com.fab.wab.merchant.app.resources.request_title
import com.fab.wab.merchant.core.common.TimeFormat
import com.fab.wab.merchant.designsystem.components.format.trimAmount
import com.fab.wab.merchant.designsystem.resources.price_jod
import com.fab.wab.merchant.designsystem.resources.time_am
import com.fab.wab.merchant.designsystem.resources.time_pm
import com.fab.wab.merchant.feature.bookings.domain.model.BookingDetails
import org.jetbrains.compose.resources.getString
import com.fab.wab.merchant.designsystem.resources.Res as DesignRes

/**
 * PRD M10 Android without the overlay permission: a heads-up notification on a high-importance "booking requests"
 * channel (alarm sound, vibration) with Accept (answered in the background) and Reject / tap (the booking in the
 * app); the full-screen intent wakes a locked phone. One notification per booking id.
 */
internal class RequestNotifier(
    private val context: Context,
    private val smallIcon: Int,
    private val bookingIntent: (String) -> Intent,
) {
    private val manager = context.getSystemService(NotificationManager::class.java)

    suspend fun show(details: BookingDetails) {
        ensureChannel()
        val id = details.summary.id
        val start = TimeFormat.instantText(details.summary.start.toString(), getString(DesignRes.string.time_am), getString(DesignRes.string.time_pm))
        val total = getString(DesignRes.string.price_jod, trimAmount(details.money.total))
        val body = getString(Res.string.request_body, details.summary.customerName, start?.date.orEmpty(), start?.time.orEmpty(), total)
        val open = activityIntent(id)
        val notification = NotificationCompat.Builder(context, CHANNEL_ID)
            .setSmallIcon(smallIcon)
            .setContentTitle(getString(Res.string.request_title))
            .setContentText(body)
            .setStyle(NotificationCompat.BigTextStyle().bigText(body))
            .setPriority(NotificationCompat.PRIORITY_MAX)
            .setCategory(NotificationCompat.CATEGORY_CALL)
            .setVisibility(NotificationCompat.VISIBILITY_PUBLIC)
            .setContentIntent(open)
            .setFullScreenIntent(open, true)
            .setAutoCancel(true)
            .addAction(0, getString(Res.string.request_accept), acceptIntent(id))
            .addAction(0, getString(Res.string.request_reject), open)
            .build()
        manager.notify(notificationId(id), notification)
    }

    /** Replaces the request with the outcome of an Accept from the notification (tap opens the booking). */
    suspend fun result(bookingId: String, text: String) {
        ensureChannel()
        val notification = NotificationCompat.Builder(context, CHANNEL_ID)
            .setSmallIcon(smallIcon)
            .setContentTitle(text)
            .setContentIntent(activityIntent(bookingId))
            .setAutoCancel(true)
            .setSilent(true)
            .build()
        manager.notify(notificationId(bookingId), notification)
    }

    private suspend fun ensureChannel() {
        if (manager.getNotificationChannel(CHANNEL_ID) != null) return
        val sound = AudioAttributes.Builder()
            .setUsage(AudioAttributes.USAGE_NOTIFICATION_RINGTONE)
            .setContentType(AudioAttributes.CONTENT_TYPE_SONIFICATION)
            .build()
        val channel = NotificationChannel(CHANNEL_ID, getString(Res.string.request_channel), NotificationManager.IMPORTANCE_HIGH).apply {
            setSound(RingtoneManager.getDefaultUri(RingtoneManager.TYPE_RINGTONE), sound)
            enableVibration(true)
            vibrationPattern = VIBRATION
            lockscreenVisibility = Notification.VISIBILITY_PUBLIC
        }
        manager.createNotificationChannel(channel)
    }

    private fun activityIntent(bookingId: String): PendingIntent = PendingIntent.getActivity(
        context,
        notificationId(bookingId),
        bookingIntent(bookingId).addFlags(Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_SINGLE_TOP),
        PendingIntent.FLAG_IMMUTABLE or PendingIntent.FLAG_UPDATE_CURRENT,
    )

    private fun acceptIntent(bookingId: String): PendingIntent = PendingIntent.getBroadcast(
        context,
        notificationId(bookingId),
        Intent(context, RequestActionReceiver::class.java)
            .setAction(RequestActionReceiver.ACTION_ACCEPT)
            .putExtra(RequestActionReceiver.EXTRA_BOOKING_ID, bookingId),
        PendingIntent.FLAG_IMMUTABLE or PendingIntent.FLAG_UPDATE_CURRENT,
    )

    private fun notificationId(bookingId: String): Int = bookingId.hashCode()

    private companion object {
        const val CHANNEL_ID = "wab_booking_requests"
        const val VIBRATE_ON_MS = 600L
        const val VIBRATE_OFF_MS = 300L
        val VIBRATION = longArrayOf(0L, VIBRATE_ON_MS, VIBRATE_OFF_MS, VIBRATE_ON_MS, VIBRATE_OFF_MS, VIBRATE_ON_MS)
    }
}
