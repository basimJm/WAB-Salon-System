package com.fab.wab.merchant.feature.bookings.presentation.di

import com.fab.wab.merchant.feature.bookings.presentation.analytics.BookingsAnalytics
import com.fab.wab.merchant.feature.bookings.presentation.controller.vm.BookingRequestsDependencies
import com.fab.wab.merchant.feature.bookings.presentation.controller.vm.BookingRequestsViewModel
import com.fab.wab.merchant.feature.bookings.presentation.resources.Res
import com.fab.wab.merchant.feature.bookings.presentation.resources.request_another_member
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.flow.Flow
import org.jetbrains.compose.resources.getString
import org.koin.core.Koin

/**
 * The request view model of the Android overlay (MER-029): requests come from [requests] (push data message or the
 * dev trigger) instead of the socket, it runs on [scope] (cancelled when the overlay window closes, there is no
 * ViewModelStore outside an activity) and tracks `request_shown` with channel `overlay`.
 */
fun overlayRequestsViewModel(koin: Koin, requests: Flow<String>, scope: CoroutineScope): BookingRequestsViewModel =
    BookingRequestsViewModel(
        BookingRequestsDependencies(
            repository = koin.get(),
            requests = requests,
            updates = bookingUpdates(koin.get()),
            clock = clockTicks(),
            alert = koin.get(),
            analytics = koin.get(),
            anotherMember = { getString(Res.string.request_another_member) },
            channel = BookingsAnalytics.CHANNEL_OVERLAY,
        ),
        testScope = scope,
    )
