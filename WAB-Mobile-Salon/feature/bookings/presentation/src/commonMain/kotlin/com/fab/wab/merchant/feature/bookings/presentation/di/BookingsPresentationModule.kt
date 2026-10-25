package com.fab.wab.merchant.feature.bookings.presentation.di

import com.fab.wab.merchant.core.domain.branch.BranchSelection
import com.fab.wab.merchant.core.domain.branch.branchScopeOf
import com.fab.wab.merchant.core.domain.session.SessionStore
import com.fab.wab.merchant.core.domain.session.memberScope
import com.fab.wab.merchant.core.notification.push.PushSignals
import com.fab.wab.merchant.feature.bookings.presentation.controller.calendar.localDate
import com.fab.wab.merchant.feature.bookings.presentation.controller.vm.BookingDetailsViewModel
import com.fab.wab.merchant.feature.bookings.presentation.controller.vm.BookingRequestsDependencies
import com.fab.wab.merchant.feature.bookings.presentation.controller.vm.BookingRequestsViewModel
import com.fab.wab.merchant.feature.bookings.presentation.controller.vm.BookingsDependencies
import com.fab.wab.merchant.feature.bookings.presentation.controller.vm.BookingsViewModel
import com.fab.wab.merchant.feature.bookings.presentation.controller.vm.CalendarDependencies
import com.fab.wab.merchant.feature.bookings.presentation.controller.vm.CalendarViewModel
import com.fab.wab.merchant.feature.bookings.presentation.resources.Res
import com.fab.wab.merchant.feature.bookings.presentation.resources.request_another_member
import kotlin.time.Clock
import kotlinx.coroutines.flow.first
import org.jetbrains.compose.resources.getString
import org.koin.core.module.dsl.viewModel
import org.koin.dsl.module

val bookingsPresentationModule = module {
    factory {
        BookingsDependencies(
            repository = get(),
            changes = bookingChanges(get()),
            clock = clockTicks(),
            analytics = get(),
            branchScope = branchScopeOf(get<SessionStore>().state, get(), get()),
            selectBranch = get<BranchSelection>()::select,
        )
    }
    viewModel { BookingsViewModel(deps = get()) }
    viewModel { (bookingId: String) ->
        BookingDetailsViewModel(
            bookingId = bookingId,
            repository = get(),
            changes = bookingChanges(get()),
            clock = clockTicks(),
            analytics = get(),
        )
    }
    viewModel {
        BookingRequestsViewModel(
            BookingRequestsDependencies(
                repository = get(),
                requests = bookingRequests(get(), PushSignals.messages),
                updates = bookingUpdates(get()),
                clock = clockTicks(),
                alert = get(),
                analytics = get(),
                anotherMember = { getString(Res.string.request_another_member) },
                memberScope = { get<SessionStore>().state.first().memberScope() },
            ),
        )
    }
    viewModel {
        CalendarViewModel(
            CalendarDependencies(
                calendar = get(),
                bookings = get(),
                session = get<SessionStore>().state,
                changes = bookingChanges(get()),
                clock = clockTicks(tickMs = CALENDAR_TICK_MS),
                today = { Clock.System.now().localDate() },
                analytics = get(),
                branchScope = branchScopeOf(get<SessionStore>().state, get(), get()),
                selectBranch = get<BranchSelection>()::select,
            ),
        )
    }
}

/** The calendar's "now" line moves once a minute. */
private const val CALENDAR_TICK_MS = 60_000L
