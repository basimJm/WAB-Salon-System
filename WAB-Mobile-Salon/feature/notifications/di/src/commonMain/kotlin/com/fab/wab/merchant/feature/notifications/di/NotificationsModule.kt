package com.fab.wab.merchant.feature.notifications.di

import com.fab.wab.merchant.feature.notifications.data.di.notificationsDataModule
import com.fab.wab.merchant.feature.notifications.domain.usecase.GetUnreadCountUseCase
import com.fab.wab.merchant.feature.notifications.domain.usecase.LoadNotificationsUseCase
import com.fab.wab.merchant.feature.notifications.domain.usecase.MarkNotificationsReadUseCase
import org.koin.core.module.dsl.singleOf
import org.koin.dsl.module

val notificationsModule = module {
    includes(notificationsDataModule)
    singleOf(::LoadNotificationsUseCase)
    singleOf(::MarkNotificationsReadUseCase)
    singleOf(::GetUnreadCountUseCase)
}
