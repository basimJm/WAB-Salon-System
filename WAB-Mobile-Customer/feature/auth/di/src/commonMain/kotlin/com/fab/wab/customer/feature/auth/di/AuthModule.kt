package com.fab.wab.customer.feature.auth.di

import com.fab.wab.customer.feature.auth.data.di.authDataModule
import com.fab.wab.customer.feature.auth.domain.repository.PendingOtpVerification
import com.fab.wab.customer.feature.auth.domain.usecase.CheckPhoneUseCase
import com.fab.wab.customer.core.domain.AppSettings
import com.fab.wab.customer.feature.auth.domain.usecase.LoginWithOtpTokenUseCase
import com.fab.wab.customer.feature.auth.domain.usecase.ChangePhoneUseCase
import com.fab.wab.customer.feature.auth.domain.usecase.LogoutUseCase
import com.fab.wab.customer.feature.auth.domain.usecase.SetPushEnabledUseCase
import com.fab.wab.customer.feature.auth.domain.usecase.SyncInstallationUseCase
import com.fab.wab.customer.feature.auth.domain.usecase.RegisterUseCase
import com.fab.wab.customer.feature.auth.domain.usecase.RequestOtpUseCase
import com.fab.wab.customer.feature.auth.domain.usecase.ResolveDialCodeUseCase
import com.fab.wab.customer.feature.auth.domain.usecase.VerifyOtpUseCase
import org.koin.core.module.dsl.singleOf
import org.koin.dsl.module

/** The app binds `InstallationInfoProvider`; everything else of the auth feature is wired here. */
val authModule = module {
    includes(authDataModule)
    singleOf(::CheckPhoneUseCase)
    singleOf(::RequestOtpUseCase)
    singleOf(::VerifyOtpUseCase)
    singleOf(::LoginWithOtpTokenUseCase)
    singleOf(::RegisterUseCase)
    singleOf(::ResolveDialCodeUseCase)
    singleOf(::PendingOtpVerification)
    singleOf(::LogoutUseCase)
    singleOf(::ChangePhoneUseCase)
    singleOf(::SetPushEnabledUseCase)
    single { SyncInstallationUseCase(installations = get(), installationInfo = get(), language = get<AppSettings>().language) }
}
