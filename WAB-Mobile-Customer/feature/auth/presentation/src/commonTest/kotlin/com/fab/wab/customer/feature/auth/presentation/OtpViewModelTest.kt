package com.fab.wab.customer.feature.auth.presentation

import com.fab.wab.customer.core.analytics.NoOpAnalyticsTracker
import com.fab.wab.customer.core.common.Clock
import com.fab.wab.customer.core.domain.AppError
import com.fab.wab.customer.core.domain.AppResult
import com.fab.wab.customer.core.domain.ErrorCode
import com.fab.wab.customer.core.domain.auth.AuthTokens
import com.fab.wab.customer.core.domain.config.AppConfig
import com.fab.wab.customer.core.domain.config.AppConfigRepository
import com.fab.wab.customer.core.domain.locations.Area
import com.fab.wab.customer.core.domain.locations.City
import com.fab.wab.customer.core.domain.locations.Country
import com.fab.wab.customer.core.domain.locations.LocationsRepository
import com.fab.wab.customer.core.domain.session.Gender
import com.fab.wab.customer.core.domain.session.GuestProfile
import com.fab.wab.customer.core.domain.session.SessionState
import com.fab.wab.customer.core.domain.session.SessionStore
import com.fab.wab.customer.core.domain.session.UserProfile
import com.fab.wab.customer.core.firebase.FakePhoneAuthGateway
import com.fab.wab.customer.core.firebase.FirebaseFailure
import com.fab.wab.customer.core.firebase.FirebaseResult
import com.fab.wab.customer.core.firebase.PhoneVerification
import com.fab.wab.customer.feature.auth.domain.model.AuthPurpose
import com.fab.wab.customer.feature.auth.domain.model.AuthSession
import com.fab.wab.customer.feature.auth.domain.model.InstallationInfo
import com.fab.wab.customer.feature.auth.domain.model.OtpPolicy
import com.fab.wab.customer.feature.auth.domain.model.PhoneCheck
import com.fab.wab.customer.feature.auth.domain.model.PhoneNumber
import com.fab.wab.customer.feature.auth.domain.model.RegisterRequest
import com.fab.wab.customer.feature.auth.domain.model.WrongAttemptResult
import com.fab.wab.customer.feature.auth.domain.repository.AuthRepository
import com.fab.wab.customer.feature.auth.domain.repository.InstallationInfoProvider
import com.fab.wab.customer.feature.auth.domain.repository.PendingOtpVerification
import com.fab.wab.customer.feature.auth.domain.usecase.LoginWithIdTokenUseCase
import com.fab.wab.customer.feature.auth.domain.usecase.ReportWrongOtpAttemptUseCase
import com.fab.wab.customer.feature.auth.domain.usecase.RequestOtpUseCase
import com.fab.wab.customer.feature.auth.domain.usecase.ResolveDialCodeUseCase
import com.fab.wab.customer.feature.auth.presentation.controller.contract.OtpContract.OtpDialog
import com.fab.wab.customer.feature.auth.presentation.controller.contract.OtpContract.SideEffect
import com.fab.wab.customer.feature.auth.presentation.controller.contract.OtpContract.UiAction
import com.fab.wab.customer.feature.auth.presentation.controller.contract.formatCountdown
import com.fab.wab.customer.feature.auth.presentation.controller.vm.OtpDependencies
import com.fab.wab.customer.feature.auth.presentation.controller.vm.OtpViewModel
import kotlinx.coroutines.ExperimentalCoroutinesApi
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.first
import kotlinx.coroutines.launch
import kotlinx.coroutines.test.TestScope
import kotlinx.coroutines.test.UnconfinedTestDispatcher
import kotlinx.coroutines.test.runTest
import kotlin.test.Test
import kotlin.test.assertEquals
import kotlin.test.assertFalse
import kotlin.test.assertNull
import kotlin.test.assertTrue
import kotlin.time.Duration.Companion.minutes
import kotlin.time.Duration.Companion.seconds
import kotlin.time.Instant

private val PHONE = PhoneNumber("JO", "791234567")
private val JORDAN = Country("JO", "الأردن", "+962", null, "^7")
private val NOW = Instant.parse("2026-10-18T10:00:00Z")
private const val RESEND_SECONDS = 60
private const val LENGTH = 6

private class FakeAuthRepository : AuthRepository {
    var policy = OtpPolicy(allowed = true, otpLength = LENGTH, resendAfterSeconds = RESEND_SECONDS)
    var wrong = WrongAttemptResult(blocked = false, attemptsRemaining = 4)
    var loginResult: AppResult<AuthSession> = AppResult.Success(
        AuthSession(AuthTokens("a1", "r1"), UserProfile("c1", "Omar", Gender.MALE)),
    )
    val requested = mutableListOf<String>()
    var wrongReports = 0
    override suspend fun checkPhone(phone: PhoneNumber, purpose: AuthPurpose): AppResult<PhoneCheck> =
        AppResult.Success(PhoneCheck.REGISTERED)
    override suspend fun requestOtp(phoneE164: String, purpose: AuthPurpose): AppResult<OtpPolicy> {
        requested += phoneE164
        return AppResult.Success(policy)
    }
    override suspend fun reportWrongAttempt(phoneE164: String): AppResult<WrongAttemptResult> {
        wrongReports += 1
        return AppResult.Success(wrong)
    }
    override suspend fun login(phone: PhoneNumber, idToken: String, installation: InstallationInfo?): AppResult<AuthSession> = loginResult
    override suspend fun register(request: RegisterRequest, installation: InstallationInfo?): AppResult<AuthSession> = loginResult
    override suspend fun logout(refreshToken: String): AppResult<Unit> = AppResult.Success(Unit)
    override suspend fun changePhone(phone: PhoneNumber, idToken: String): AppResult<UserProfile> =
        AppResult.Success(UserProfile("c1", "Sara", null))
}

private class FakeSessionStore : SessionStore {
    var signedIn: UserProfile? = null
    override val state: Flow<SessionState> = MutableStateFlow(SessionState.Guest())
    override val onboardingSeen: Flow<Boolean> = MutableStateFlow(true)
    override val pushEnabled: Flow<Boolean> = MutableStateFlow(true)
    override suspend fun tokens(): AuthTokens? = null
    override suspend fun signIn(tokens: AuthTokens, user: UserProfile) {
        signedIn = user
    }
    override suspend fun updateTokens(tokens: AuthTokens) = Unit
    override suspend fun updateUser(user: UserProfile) = Unit
    override suspend fun setOnboardingSeen(seen: Boolean) = Unit
    override suspend fun setGuestProfile(profile: GuestProfile) = Unit
    override suspend fun setPushEnabled(enabled: Boolean) = Unit
    override suspend fun signOut() = Unit
    override suspend fun clearAll() = Unit
}

private class OtpFakeLocations : LocationsRepository {
    override suspend fun countries(refresh: Boolean): AppResult<List<Country>> = AppResult.Success(listOf(JORDAN))
    override suspend fun cities(countryCode: String, refresh: Boolean): AppResult<List<City>> = AppResult.Success(emptyList())
    override suspend fun areas(cityId: String, refresh: Boolean): AppResult<List<Area>> = AppResult.Success(emptyList())
}

private object NoConfig : AppConfigRepository {
    override val current: StateFlow<AppConfig?> = MutableStateFlow(null)
    override suspend fun refresh(): AppResult<AppConfig> = AppResult.Error(AppError.UnknownError(""))
}

@OptIn(ExperimentalCoroutinesApi::class)
class OtpViewModelTest {

    private val repository = FakeAuthRepository()
    private val gateway = FakePhoneAuthGateway()
    private val session = FakeSessionStore()
    private val pending = PendingOtpVerification()
    private val clock = object : Clock {
        override fun now(): Instant = NOW
    }

    private fun TestScope.viewModel(purpose: AuthPurpose = AuthPurpose.LOGIN) = OtpViewModel(
        purpose = purpose,
        phone = PHONE,
        deps = OtpDependencies(
            requestOtp = RequestOtpUseCase(repository),
            reportWrongAttempt = ReportWrongOtpAttemptUseCase(repository),
            loginWithIdToken = LoginWithIdTokenUseCase(repository, { null }, session),
            resolveDialCode = ResolveDialCodeUseCase(OtpFakeLocations()),
            phoneAuth = gateway,
            appConfig = NoConfig,
            pending = pending,
            analytics = NoOpAnalyticsTracker,
            clock = clock,
            errorText = { "failed" },
        ),
        testScope = backgroundScope,
    ).also { viewModel -> backgroundScope.launch { viewModel.state.collect {} } }

    @Test
    fun requestsTheCodeForTheE164NumberAndCountsDownToResend() = runTest(UnconfinedTestDispatcher()) {
        val viewModel = viewModel()
        val ready = viewModel.state.first { !it.requesting }
        assertEquals("+962791234567", ready.phoneDisplay)
        assertEquals(listOf("+962791234567"), repository.requested)
        assertEquals(listOf("+962791234567"), gateway.startedPhones)
        assertEquals(LENGTH, ready.otpLength)
        assertEquals(RESEND_SECONDS, ready.resendRemainingSeconds)
        assertFalse(ready.canResend)
        testScheduler.advanceTimeBy((RESEND_SECONDS + 1).seconds)
        testScheduler.runCurrent()
        val expired = viewModel.state.first { it.resendRemainingSeconds == 0 }
        assertTrue(expired.canResend)
        viewModel.onEvent(UiAction.OnResendClick)
        testScheduler.runCurrent()
        assertEquals(2, repository.requested.size)
    }

    @Test
    fun correctCodeLogsInStoresTheSessionAndGoesHome() = runTest(UnconfinedTestDispatcher()) {
        val viewModel = viewModel()
        val effects = mutableListOf<SideEffect>()
        backgroundScope.launch { viewModel.sideEffect.collect { effects += it } }
        viewModel.state.first { !it.requesting }
        viewModel.onEvent(UiAction.OnCodeChange("12a456"))
        assertEquals("12456", viewModel.state.first().code)
        viewModel.onEvent(UiAction.OnCodeChange("123456"))
        assertTrue(viewModel.state.first().canVerify)
        viewModel.onEvent(UiAction.OnVerifyClick)
        testScheduler.runCurrent()
        assertEquals(listOf<SideEffect>(SideEffect.NavigateHome), effects)
        assertEquals("Omar", session.signedIn?.firstName)
        assertEquals(listOf("123456"), gateway.confirmedCodes)
    }

    @Test
    fun wrongCodeIsReportedAndABlockStartsTheRemainingTime() = runTest(UnconfinedTestDispatcher()) {
        gateway.confirmResult = FirebaseResult.Failure(FirebaseFailure.InvalidCode)
        repository.wrong = WrongAttemptResult(blocked = true, attemptsRemaining = 0, blockedUntil = NOW + 15.minutes)
        val viewModel = viewModel()
        viewModel.state.first { !it.requesting }
        viewModel.onEvent(UiAction.OnCodeChange("000000"))
        viewModel.onEvent(UiAction.OnVerifyClick)
        testScheduler.runCurrent()
        val state = viewModel.state.first { it.codeError }
        assertEquals(1, repository.wrongReports)
        assertTrue(state.isBlocked)
        assertEquals(15 * 60, state.blockedRemainingSeconds)
        assertFalse(state.canVerify)
        assertEquals("15:00", formatCountdown(state.blockedRemainingSeconds))
    }

    @Test
    fun expiredCodeShowsThePopupAndServerOtpErrorsMapBack() = runTest(UnconfinedTestDispatcher()) {
        gateway.confirmResult = FirebaseResult.Failure(FirebaseFailure.CodeExpired)
        val viewModel = viewModel()
        viewModel.state.first { !it.requesting }
        viewModel.onEvent(UiAction.OnCodeChange("123456"))
        viewModel.onEvent(UiAction.OnVerifyClick)
        testScheduler.runCurrent()
        assertEquals(OtpDialog.Expired, viewModel.state.first().dialog)
        viewModel.onEvent(UiAction.OnDialogDismiss)
        assertNull(viewModel.state.first().dialog)
        gateway.confirmResult = FirebaseResult.Success("proof")
        repository.loginResult = AppResult.Error(AppError.ServerError(ErrorCode.OTP_INVALID, 401, null))
        viewModel.onEvent(UiAction.OnVerifyClick)
        testScheduler.runCurrent()
        assertTrue(viewModel.state.first().codeError)
    }

    @Test
    fun otherPurposesPublishTheProofAndGoBack() = runTest(UnconfinedTestDispatcher()) {
        val viewModel = viewModel(AuthPurpose.REGISTER)
        val effects = mutableListOf<SideEffect>()
        backgroundScope.launch { viewModel.sideEffect.collect { effects += it } }
        viewModel.state.first { !it.requesting }
        viewModel.onEvent(UiAction.OnCodeChange("123456"))
        viewModel.onEvent(UiAction.OnVerifyClick)
        testScheduler.runCurrent()
        assertEquals(listOf<SideEffect>(SideEffect.NavigateBack), effects)
        val proof = pending.consume()
        assertEquals(FakePhoneAuthGateway.DEFAULT_PROOF, proof?.idToken)
        assertEquals(AuthPurpose.REGISTER, proof?.purpose)
        assertNull(pending.consume())
        assertNull(session.signedIn)
    }

    @Test
    fun notAllowedWithBlockShowsRemainingTimeAndAutoVerificationSkipsTheCode() = runTest(UnconfinedTestDispatcher()) {
        repository.policy = OtpPolicy(false, LENGTH, RESEND_SECONDS, blockedUntil = NOW + 90.seconds)
        val blocked = viewModel()
        val state = blocked.state.first { !it.requesting }
        assertEquals(90, state.blockedRemainingSeconds)
        assertTrue(gateway.startedPhones.isEmpty())

        repository.policy = OtpPolicy(allowed = true, otpLength = LENGTH, resendAfterSeconds = RESEND_SECONDS)
        gateway.startResult = FirebaseResult.Success(PhoneVerification("v", autoVerifiedIdToken = "auto"))
        val auto = viewModel()
        val effects = mutableListOf<SideEffect>()
        backgroundScope.launch { auto.sideEffect.collect { effects += it } }
        auto.state.first { !it.requesting }
        testScheduler.runCurrent()
        assertEquals(listOf<SideEffect>(SideEffect.NavigateHome), effects)
    }
}
