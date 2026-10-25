package com.fab.wab.merchant.feature.home.presentation.di

import com.fab.wab.merchant.core.domain.permission.PermissionsSync
import com.fab.wab.merchant.core.domain.session.SessionStore
import com.fab.wab.merchant.core.realtime.RealtimeClient
import com.fab.wab.merchant.core.realtime.RealtimeEvents
import com.fab.wab.merchant.feature.home.presentation.controller.vm.HomeDependencies
import com.fab.wab.merchant.feature.home.presentation.controller.vm.HomeViewModel
import kotlinx.coroutines.delay
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.filter
import kotlinx.coroutines.flow.flow
import kotlinx.coroutines.flow.map
import org.koin.core.module.dsl.viewModel
import org.koin.dsl.module
import kotlin.time.Clock

/** Request ages on Home move by the minute; one tick a second keeps the auto-cancel countdown exact. */
private const val CLOCK_TICK_MS = 1_000L

/** Socket events after which Home reloads (BUSINESS_DOMAIN §7). */
private val DASHBOARD_EVENTS = setOf(
    RealtimeEvents.BOOKING_REQUESTED,
    RealtimeEvents.BOOKING_UPDATED,
    RealtimeEvents.BOOKING_ASSIGNED,
)

internal fun clockTicks(clock: Clock = Clock.System): Flow<Long> = flow {
    while (true) {
        emit(clock.now().toEpochMilliseconds())
        delay(CLOCK_TICK_MS)
    }
}

val homePresentationModule = module {
    viewModel {
        val sync = get<PermissionsSync>()
        HomeViewModel(
            HomeDependencies(
                dashboard = get(),
                session = get<SessionStore>().state,
                refreshPermissions = { sync.refresh() },
                analytics = get(),
                clock = clockTicks(),
                bookingChanges = get<RealtimeClient>().events.filter { it.name in DASHBOARD_EVENTS }.map { },
            ),
        )
    }
}
