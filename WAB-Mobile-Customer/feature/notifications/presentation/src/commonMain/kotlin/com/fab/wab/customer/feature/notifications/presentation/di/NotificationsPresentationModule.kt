package com.fab.wab.customer.feature.notifications.presentation.di

import com.fab.wab.customer.feature.notifications.presentation.controller.vm.NotificationsDependencies
import com.fab.wab.customer.feature.notifications.presentation.controller.vm.NotificationsViewModel
import org.koin.core.module.dsl.viewModel
import org.koin.dsl.module

val notificationsPresentationModule = module {
    factory { NotificationsDependencies(loadNotifications = get(), markRead = get(), realtime = get(), analytics = get()) }
    viewModel { NotificationsViewModel(deps = get()) }
}
