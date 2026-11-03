package com.fab.wab.merchant.feature.bookings.presentation.di

import com.fab.wab.merchant.core.common.BusinessTime
import com.fab.wab.merchant.core.domain.branch.BranchSelection
import com.fab.wab.merchant.core.domain.branch.branchScopeOf
import com.fab.wab.merchant.core.domain.permission.Permission
import com.fab.wab.merchant.core.domain.permission.permissionSet
import com.fab.wab.merchant.core.domain.salon.SalonRepository
import com.fab.wab.merchant.core.domain.salon.currentKind
import com.fab.wab.merchant.core.domain.session.SessionStore
import com.fab.wab.merchant.core.domain.session.memberScope
import com.fab.wab.merchant.core.domain.upload.UploadFileUseCase
import com.fab.wab.merchant.core.notification.push.PushSignals
import com.fab.wab.merchant.feature.bookings.presentation.controller.calendar.localDate
import com.fab.wab.merchant.feature.bookings.presentation.controller.calendar.minuteOn
import com.fab.wab.merchant.feature.bookings.presentation.controller.vm.BookingDetailsViewModel
import com.fab.wab.merchant.feature.bookings.presentation.controller.vm.BookingRequestsDependencies
import com.fab.wab.merchant.feature.bookings.presentation.controller.vm.BookingRequestsViewModel
import com.fab.wab.merchant.feature.bookings.presentation.controller.vm.BookingsDependencies
import com.fab.wab.merchant.feature.bookings.presentation.controller.vm.BookingsViewModel
import com.fab.wab.merchant.feature.bookings.presentation.controller.vm.CalendarDependencies
import com.fab.wab.merchant.feature.bookings.presentation.controller.vm.CalendarViewModel
import com.fab.wab.merchant.feature.bookings.presentation.controller.vm.NewBookingDependencies
import com.fab.wab.merchant.feature.bookings.presentation.controller.vm.NewBookingViewModel
import com.fab.wab.merchant.feature.bookings.presentation.resources.Res
import com.fab.wab.merchant.feature.bookings.presentation.resources.request_another_member
import kotlin.time.Clock
import kotlinx.coroutines.flow.first
import kotlinx.coroutines.flow.map
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
            canCreate = get<SessionStore>().state.map { it.permissionSet().has(Permission.BOOKINGS_CREATE) },
        )
    }
    viewModel { BookingsViewModel(deps = get()) }
    viewModel {
        val uploads = get<UploadFileUseCase>()
        NewBookingViewModel(
            NewBookingDependencies(
                repository = get(),
                bookings = get(),
                locations = get(),
                branchId = { branchScopeOf(get<SessionStore>().state, get(), get()).first().filter },
                kind = { get<SalonRepository>().currentKind() },
                today = { Clock.System.now().localDate() },
                nowMinute = { Clock.System.now().let { now -> now.minuteOn(now.localDate()) } },
                zone = BusinessTime.zone,
                analytics = get(),
                picker = get(),
                upload = { file, purpose -> uploads(file, purpose) },
            ),
        )
    }
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
