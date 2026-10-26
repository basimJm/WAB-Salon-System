package com.fab.wab.merchant.feature.auth.presentation

import com.fab.wab.merchant.core.analytics.NoOpAnalyticsTracker
import com.fab.wab.merchant.core.common.Clock
import com.fab.wab.merchant.core.domain.AppError
import com.fab.wab.merchant.core.domain.AppResult
import com.fab.wab.merchant.core.domain.ErrorCode
import com.fab.wab.merchant.core.domain.FieldError
import com.fab.wab.merchant.core.domain.config.AppConfig
import com.fab.wab.merchant.core.domain.config.AppConfigRepository
import com.fab.wab.merchant.core.domain.locations.Area
import com.fab.wab.merchant.core.domain.locations.City
import com.fab.wab.merchant.core.domain.locations.Country
import com.fab.wab.merchant.core.domain.locations.LocationsRepository
import com.fab.wab.merchant.feature.auth.domain.model.AuthPurpose
import com.fab.wab.merchant.feature.auth.domain.model.PhoneNumber
import com.fab.wab.merchant.feature.auth.domain.repository.PendingOtpVerification
import com.fab.wab.merchant.feature.auth.domain.usecase.LoginWithOtpTokenUseCase
import com.fab.wab.merchant.feature.auth.domain.usecase.RequestOtpUseCase
import com.fab.wab.merchant.feature.auth.domain.usecase.ResolveDialCodeUseCase
import com.fab.wab.merchant.feature.auth.domain.usecase.VerifyOtpUseCase
import com.fab.wab.merchant.feature.auth.presentation.controller.contract.OtpContract.SideEffect
import com.fab.wab.merchant.feature.auth.presentation.controller.contract.OtpContract.UiAction
import com.fab.wab.merchant.feature.auth.presentation.controller.vm.OtpDependencies
import com.fab.wab.merchant.feature.auth.presentation.controller.vm.OtpViewModel
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.first
import kotlinx.coroutines.launch
import kotlinx.coroutines.test.TestScope
import kotlin.time.Instant

internal val OTP_PHONE = PhoneNumber("JO", "791234567")
internal const val OTP_E164 = "+962791234567"
internal const val RIGHT_CODE = "123456"
internal const val ERROR_TEXT = "failed"
internal const val HTTP_UNAUTHORIZED = 401
internal const val HTTP_TOO_MANY = 429
internal val OTP_NOW: Instant = Instant.parse("2026-10-18T10:00:00Z")

private val JORDAN = Country("JO", "الأردن", "+962", null, "^7")

private class OtpFakeLocations : LocationsRepository {
    override suspend fun countries(refresh: Boolean): AppResult<List<Country>> = AppResult.Success(listOf(JORDAN))
    override suspend fun cities(countryCode: String, refresh: Boolean): AppResult<List<City>> = AppResult.Success(emptyList())
    override suspend fun areas(cityId: String, refresh: Boolean): AppResult<List<Area>> = AppResult.Success(emptyList())
}

private object NoConfig : AppConfigRepository {
    override val current: StateFlow<AppConfig?> = MutableStateFlow(null)
    override suspend fun refresh(): AppResult<AppConfig> = AppResult.Error(AppError.UnknownError(""))
}

internal fun serverError(code: ErrorCode, status: Int = HTTP_UNAUTHORIZED, details: List<FieldError> = emptyList()) =
    AppResult.Error(AppError.ServerError(code, status, null, details))

/** One OTP screen over the fake repository; [effects] collects every side effect. */
internal class OtpHarness(private val scope: TestScope) {
    val repository = FakeAuthRepository()
    val session = FakeSessionStore()
    val pending = PendingOtpVerification()
    val effects = mutableListOf<SideEffect>()
    private val clock = object : Clock {
        override fun now(): Instant = OTP_NOW
    }

    fun viewModel(purpose: AuthPurpose = AuthPurpose.LOGIN): OtpViewModel {
        val viewModel = OtpViewModel(
            purpose = purpose,
            phone = OTP_PHONE,
            deps = OtpDependencies(
                requestOtp = RequestOtpUseCase(repository),
                verifyOtp = VerifyOtpUseCase(repository),
                loginWithOtpToken = LoginWithOtpTokenUseCase(repository, { null }, session),
                resolveDialCode = ResolveDialCodeUseCase(OtpFakeLocations()),
                appConfig = NoConfig,
                pending = pending,
                analytics = NoOpAnalyticsTracker,
                clock = clock,
                errorText = { ERROR_TEXT },
            ),
            testScope = scope.backgroundScope,
        )
        scope.backgroundScope.launch { viewModel.state.collect {} }
        scope.backgroundScope.launch { viewModel.sideEffect.collect { effects += it } }
        return viewModel
    }
}

/** Waits for the first request, types [code] and taps Verify. */
internal suspend fun OtpViewModel.enterAndVerify(scope: TestScope, code: String = RIGHT_CODE) {
    state.first { !it.requesting }
    onEvent(UiAction.OnCodeChange(code))
    onEvent(UiAction.OnVerifyClick)
    scope.testScheduler.runCurrent()
}
