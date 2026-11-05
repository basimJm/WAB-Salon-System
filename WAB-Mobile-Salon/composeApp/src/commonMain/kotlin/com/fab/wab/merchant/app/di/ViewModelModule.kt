package com.fab.wab.merchant.app.di

import com.fab.wab.merchant.app.controller.vm.MainViewModel
import com.fab.wab.merchant.app.permission.AlertsPermissionViewModel
import com.fab.wab.merchant.app.push.InstallationSync
import com.fab.wab.merchant.app.realtime.RealtimeAccountEvents
import com.fab.wab.merchant.core.domain.salon.SalonRepository
import com.fab.wab.merchant.core.domain.session.SessionStore
import com.fab.wab.merchant.core.firebase.PushTokenProvider
import com.fab.wab.merchant.feature.auth.domain.usecase.SyncInstallationUseCase
import org.koin.core.module.dsl.viewModel
import org.koin.dsl.module

/** Explicit constructor call: the test-scope seam of the view model is not a Koin type. */
val viewModelModule = module {
    viewModel {
        MainViewModel(
            appConfigRepository = get(),
            appSettings = get(),
            appearanceSettings = get(),
            sessionTimeOut = get(),
            environment = get(),
            sessionAnalyticsSync = get(),
            permissionsSync = get(),
            accountEvents = RealtimeAccountEvents(client = get(), permissionsSync = get(), sessionStore = get()),
            session = get<SessionStore>().state,
            refreshSalon = { get<SalonRepository>().refresh() },
            installationSync = InstallationSync(
                session = get<SessionStore>().state,
                tokenUpdates = get<PushTokenProvider>().tokenUpdates,
                sync = { get<SyncInstallationUseCase>()() },
            ),
        )
    }
    viewModel { (answersRequests: Boolean) ->
        AlertsPermissionViewModel(
            permissions = get(),
            manager = get(),
            overlay = get(),
            session = get(),
            answersRequests = answersRequests,
        )
    }
}
