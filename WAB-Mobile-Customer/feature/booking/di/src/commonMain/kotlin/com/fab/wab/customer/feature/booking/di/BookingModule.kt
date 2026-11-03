package com.fab.wab.customer.feature.booking.di

import com.fab.wab.customer.feature.booking.data.di.bookingDataModule
import com.fab.wab.customer.feature.booking.domain.usecase.CreateBookingDraftUseCase
import com.fab.wab.customer.feature.booking.domain.usecase.CreateBookingUseCase
import com.fab.wab.customer.feature.booking.domain.usecase.DeleteBookingDraftUseCase
import com.fab.wab.customer.feature.booking.domain.usecase.GetBookingDraftUseCase
import com.fab.wab.customer.feature.booking.domain.usecase.LoadAvailabilityUseCase
import com.fab.wab.customer.feature.booking.domain.usecase.UploadReferenceImageUseCase
import com.fab.wab.customer.feature.booking.domain.usecase.VerifyBookingOtpUseCase
import org.koin.core.module.dsl.singleOf
import org.koin.dsl.module

val bookingModule = module {
    includes(bookingDataModule)
    singleOf(::CreateBookingDraftUseCase)
    singleOf(::GetBookingDraftUseCase)
    singleOf(::DeleteBookingDraftUseCase)
    singleOf(::LoadAvailabilityUseCase)
    singleOf(::VerifyBookingOtpUseCase)
    singleOf(::CreateBookingUseCase)
    singleOf(::UploadReferenceImageUseCase)
}
