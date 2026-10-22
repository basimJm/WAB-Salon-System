package com.fab.wab.customer.feature.notifications.data.di

import com.fab.wab.customer.feature.notifications.data.remote.NotificationsApi
import com.fab.wab.customer.feature.notifications.data.repository.NotificationsRepositoryImpl
import com.fab.wab.customer.feature.notifications.domain.repository.NotificationsRepository
import org.koin.dsl.module

val notificationsDataModule = module {
    single { NotificationsApi(get()) }
    single<NotificationsRepository> { NotificationsRepositoryImpl(get()) }
}
