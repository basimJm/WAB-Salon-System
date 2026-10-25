package com.fab.wab.merchant.feature.auth.di

import com.fab.wab.merchant.feature.auth.data.di.authDataModule
import com.fab.wab.merchant.feature.auth.domain.repository.PendingOtpVerification
import com.fab.wab.merchant.feature.auth.domain.usecase.CheckPhoneUseCase
import com.fab.wab.merchant.core.domain.AppSettings
import com.fab.wab.merchant.feature.auth.domain.usecase.LoginWithIdTokenUseCase
import com.fab.wab.merchant.feature.auth.domain.usecase.LogoutUseCase
import com.fab.wab.merchant.feature.auth.domain.usecase.SyncInstallationUseCase
import com.fab.wab.merchant.feature.auth.domain.usecase.ReportWrongOtpAttemptUseCase
import com.fab.wab.merchant.feature.auth.domain.usecase.RequestOtpUseCase
import com.fab.wab.merchant.feature.auth.domain.usecase.ResolveDialCodeUseCase
import org.koin.core.module.dsl.singleOf
import org.koin.dsl.module

/** The app binds `InstallationInfoProvider`; everything else of the auth feature is wired here. */
val authModule = module {
    includes(authDataModule)
    singleOf(::CheckPhoneUseCase)
    singleOf(::RequestOtpUseCase)
    singleOf(::ReportWrongOtpAttemptUseCase)
    singleOf(::LoginWithIdTokenUseCase)
    singleOf(::ResolveDialCodeUseCase)
    singleOf(::PendingOtpVerification)
    singleOf(::LogoutUseCase)
    single { SyncInstallationUseCase(installations = get(), installationInfo = get(), language = get<AppSettings>().language) }
}
