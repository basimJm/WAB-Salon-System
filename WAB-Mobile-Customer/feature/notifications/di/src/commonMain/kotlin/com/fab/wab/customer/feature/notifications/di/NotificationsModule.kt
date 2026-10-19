package com.fab.wab.customer.feature.notifications.di

import com.fab.wab.customer.feature.notifications.data.di.notificationsDataModule
import com.fab.wab.customer.feature.notifications.domain.usecase.GetUnreadCountUseCase
import com.fab.wab.customer.feature.notifications.domain.usecase.LoadNotificationsUseCase
import com.fab.wab.customer.feature.notifications.domain.usecase.MarkNotificationsReadUseCase
import org.koin.core.module.dsl.singleOf
import org.koin.dsl.module

val notificationsModule = module {
    includes(notificationsDataModule)
    singleOf(::LoadNotificationsUseCase)
    singleOf(::MarkNotificationsReadUseCase)
    singleOf(::GetUnreadCountUseCase)
}
