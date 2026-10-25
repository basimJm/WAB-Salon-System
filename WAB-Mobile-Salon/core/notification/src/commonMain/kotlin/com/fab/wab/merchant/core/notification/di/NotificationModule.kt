package com.fab.wab.merchant.core.notification.di

import com.fab.wab.merchant.core.notification.state.NotificationViewModel
import org.koin.core.module.dsl.viewModelOf
import org.koin.dsl.module

val notificationModule = module {
    viewModelOf(::NotificationViewModel)
}
