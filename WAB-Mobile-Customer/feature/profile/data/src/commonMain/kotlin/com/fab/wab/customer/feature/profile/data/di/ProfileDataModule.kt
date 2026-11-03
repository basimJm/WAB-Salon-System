package com.fab.wab.customer.feature.profile.data.di

import com.fab.wab.customer.feature.profile.data.remote.ProfileApi
import com.fab.wab.customer.feature.profile.data.repository.ProfileRepositoryImpl
import com.fab.wab.customer.feature.profile.domain.repository.ProfileRepository
import org.koin.dsl.module

/** Uploads (presign → PUT → confirm) are bound in core `dataModule` (shared with the tattoo design image, CUS-104). */
val profileDataModule = module {
    single { ProfileApi(get()) }
    single<ProfileRepository> { ProfileRepositoryImpl(get()) }
}
