package com.fab.wab.customer.feature.sample.data.di

import com.fab.wab.customer.feature.sample.data.remote.service.SampleApiService
import com.fab.wab.customer.feature.sample.data.remote.service.SampleApiServiceImpl
import com.fab.wab.customer.feature.sample.data.repository.SampleRepositoryImpl
import com.fab.wab.customer.feature.sample.domain.repository.SampleRepository
import org.koin.dsl.module

val sampleDataModule = module {
    single<SampleApiService> { SampleApiServiceImpl(get()) }
    single<SampleRepository> { SampleRepositoryImpl(get()) }
}
