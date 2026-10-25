package com.fab.wab.merchant.feature.content.data.di

import com.fab.wab.merchant.feature.content.data.remote.ContentApi
import com.fab.wab.merchant.feature.content.data.repository.ContentRepositoryImpl
import com.fab.wab.merchant.feature.content.domain.repository.ContentRepository
import org.koin.dsl.module

val contentDataModule = module {
    single { ContentApi(get()) }
    single<ContentRepository> { ContentRepositoryImpl(get()) }
}
