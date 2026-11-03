package com.fab.wab.merchant.request

import android.content.Context
import android.content.Intent
import androidx.core.net.toUri
import com.fab.wab.merchant.R
import com.fab.wab.merchant.app.deeplink.MerchantDeepLinkPaths
import com.fab.wab.merchant.app.request.CloseReminders
import com.fab.wab.merchant.app.request.OutsideBookingRequests
import com.fab.wab.merchant.core.common.AppEnvironment
import com.fab.wab.merchant.core.common.DeepLinks
import com.fab.wab.merchant.main.MainActivity
import org.koin.android.ext.koin.androidContext
import org.koin.dsl.module

/** Booking requests outside the app (MER-029): opening a booking = the `/bookings/<id>` app link into MainActivity. */
internal val requestModule = module {
    // MER-086: close reminders with Completed / No-show; the tap opens the same booking link.
    single {
        val context: Context = androidContext()
        val environment: AppEnvironment = get()
        CloseReminders(context, getKoin(), R.mipmap.ic_launcher_foreground) { bookingId ->
            Intent(context, MainActivity::class.java)
                .setAction(Intent.ACTION_VIEW)
                .setData(DeepLinks.of(environment.webBaseUrl, MerchantDeepLinkPaths.BOOKINGS, bookingId).toUri())
        }
    }
    single {
        val context: Context = androidContext()
        val environment: AppEnvironment = get()
        OutsideBookingRequests(context, getKoin(), R.mipmap.ic_launcher_foreground) { bookingId ->
            Intent(context, MainActivity::class.java)
                .setAction(Intent.ACTION_VIEW)
                .setData(DeepLinks.of(environment.webBaseUrl, MerchantDeepLinkPaths.BOOKINGS, bookingId).toUri())
        }
    }
}
