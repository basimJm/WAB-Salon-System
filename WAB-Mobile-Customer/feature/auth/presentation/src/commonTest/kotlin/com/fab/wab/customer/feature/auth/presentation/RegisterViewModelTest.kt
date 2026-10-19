package com.fab.wab.customer.feature.auth.presentation

import com.fab.wab.customer.core.analytics.NoOpAnalyticsTracker
import com.fab.wab.customer.core.domain.AppLanguage
import com.fab.wab.customer.core.domain.AppResult
import com.fab.wab.customer.core.domain.AppSettings
import com.fab.wab.customer.core.domain.AppearanceSettings
import com.fab.wab.customer.core.domain.ThemeMode
import com.fab.wab.customer.core.domain.auth.AuthTokens
import com.fab.wab.customer.core.domain.locations.Area
import com.fab.wab.customer.core.domain.locations.City
import com.fab.wab.customer.core.domain.locations.Country
import com.fab.wab.customer.core.domain.locations.LocationsRepository
import com.fab.wab.customer.core.domain.session.Gender
import com.fab.wab.customer.core.domain.session.GuestProfile
import com.fab.wab.customer.core.domain.session.SessionState
import com.fab.wab.customer.core.domain.session.SessionStore
import com.fab.wab.customer.core.domain.session.UserProfile
import com.fab.wab.customer.feature.auth.domain.model.AuthPurpose
import com.fab.wab.customer.feature.auth.domain.model.AuthSession
import com.fab.wab.customer.feature.auth.domain.model.InstallationInfo
import com.fab.wab.customer.feature.auth.domain.model.OtpPolicy
import com.fab.wab.customer.feature.auth.domain.model.OtpVerified
import com.fab.wab.customer.feature.auth.domain.model.PhoneCheck
import com.fab.wab.customer.feature.auth.domain.model.PhoneNumber
import com.fab.wab.customer.feature.auth.domain.model.RegisterRequest
import com.fab.wab.customer.feature.auth.domain.model.WrongAttemptResult
import com.fab.wab.customer.feature.auth.domain.repository.AuthRepository
import com.fab.wab.customer.feature.auth.domain.repository.PendingOtpVerification
import com.fab.wab.customer.feature.auth.domain.usecase.CheckPhoneUseCase
import com.fab.wab.customer.feature.auth.domain.usecase.RegisterUseCase
import com.fab.wab.customer.feature.auth.presentation.controller.contract.RegisterContract.RegisterField
import com.fab.wab.customer.feature.auth.presentation.controller.contract.RegisterContract.SideEffect
import com.fab.wab.customer.feature.auth.presentation.controller.contract.RegisterContract.UiAction
import com.fab.wab.customer.feature.auth.presentation.controller.vm.RegisterDependencies
import com.fab.wab.customer.feature.auth.presentation.controller.vm.RegisterViewModel
import kotlinx.coroutines.ExperimentalCoroutinesApi
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.launch
import kotlinx.coroutines.test.TestScope
import kotlinx.coroutines.test.UnconfinedTestDispatcher
import kotlinx.coroutines.test.runTest
import kotlin.test.Test
import kotlin.test.assertEquals
import kotlin.test.assertFalse
import kotlin.test.assertNull
import kotlin.test.assertTrue

private val JORDAN = Country("JO", "الأردن", "+962", null, "^7[789]\\d{7}$")
private val AMMAN = City("amman", "عمّان")
private val ABDOUN = Area("a1", "عبدون")

private class RegisterFakeLocations : LocationsRepository {
    var areaCalls = mutableListOf<String>()
    override suspend fun countries(refresh: Boolean): AppResult<List<Country>> = AppResult.Success(listOf(JORDAN))
    override suspend fun cities(countryCode: String, refresh: Boolean): AppResult<List<City>> = AppResult.Success(listOf(AMMAN))
    override suspend fun areas(cityId: String, refresh: Boolean): AppResult<List<Area>> {
        areaCalls += cityId
        return AppResult.Success(listOf(ABDOUN))
    }
}

private class RegisterFakeAuth : AuthRepository {
    var check: AppResult<PhoneCheck> = AppResult.Success(PhoneCheck.NOT_REGISTERED)
    var registered: RegisterRequest? = null
    override suspend fun checkPhone(phone: PhoneNumber, purpose: AuthPurpose): AppResult<PhoneCheck> = check
    override suspend fun requestOtp(phoneE164: String, purpose: AuthPurpose): AppResult<OtpPolicy> = AppResult.Loading
    override suspend fun reportWrongAttempt(phoneE164: String): AppResult<WrongAttemptResult> = AppResult.Loading
    override suspend fun login(phone: PhoneNumber, idToken: String, installation: InstallationInfo?): AppResult<AuthSession> =
        AppResult.Loading
    override suspend fun register(request: RegisterRequest, installation: InstallationInfo?): AppResult<AuthSession> {
        registered = request
        return AppResult.Success(AuthSession(AuthTokens("a", "r"), UserProfile("c1", request.firstName, request.gender)))
    }
    override suspend fun logout(refreshToken: String): AppResult<Unit> = AppResult.Success(Unit)
    override suspend fun changePhone(phone: PhoneNumber, idToken: String): AppResult<UserProfile> =
        AppResult.Success(UserProfile("c1", "Sara", null))
}

private class GuestSessionStore : SessionStore {
    var signedIn: UserProfile? = null
    override val state: Flow<SessionState> = MutableStateFlow(SessionState.Guest(GuestProfile("Sara", Gender.FEMALE)))
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

private class RegisterSettings : AppSettings {
    private val text = MutableStateFlow<String?>(null)
    override val language: Flow<String> = MutableStateFlow(AppLanguage.DEFAULT.code)
    override val themeMode: Flow<ThemeMode> = MutableStateFlow(ThemeMode.SYSTEM)
    override val token: Flow<String?> = text
    override val fcmToken: Flow<String?> = text
    override val refreshToken: Flow<String?> = text
    override val userId: Flow<String?> = text
    override val userRole: Flow<String?> = text
    override val userName: Flow<String?> = text
    override val onboardingCompleted: Flow<Boolean> = MutableStateFlow(false)
    override val lastSyncTimestamp: Flow<Long?> = MutableStateFlow(null)
    override val deviceId: Flow<String?> = text
    override suspend fun setLanguage(language: String) = Unit
    override suspend fun setThemeMode(mode: ThemeMode) = Unit
    override suspend fun setToken(token: String?) = Unit
    override suspend fun setFcmToken(fcmToken: String?) = Unit
    override suspend fun setRefreshToken(token: String?) = Unit
    override suspend fun setUserId(id: String?) = Unit
    override suspend fun setUserRole(role: String?) = Unit
    override suspend fun setUserName(name: String?) = Unit
    override suspend fun setOnboardingCompleted(completed: Boolean) = Unit
    override suspend fun setLastSyncTimestamp(timestamp: Long) = Unit
    override suspend fun setDeviceId(id: String?) = Unit
    override suspend fun clearAll() = Unit
    override suspend fun clearSession() = Unit
}

@OptIn(ExperimentalCoroutinesApi::class)
class RegisterViewModelTest {

    private val auth = RegisterFakeAuth()
    private val locations = RegisterFakeLocations()
    private val session = GuestSessionStore()
    private val pending = PendingOtpVerification()

    private fun TestScope.viewModel(prefill: PhoneNumber? = PhoneNumber("JO", "791234567")) = RegisterViewModel(
        prefill = prefill,
        deps = RegisterDependencies(
            checkPhone = CheckPhoneUseCase(auth),
            register = RegisterUseCase(auth, { null }, session),
            locations = locations,
            sessionStore = session,
            appearance = AppearanceSettings(RegisterSettings()),
            pending = pending,
            analytics = NoOpAnalyticsTracker,
            errorText = { "failed" },
        ),
        testScope = backgroundScope,
    ).also { viewModel -> backgroundScope.launch { viewModel.state.collect {} } }

    private fun TestScope.fillAll(viewModel: RegisterViewModel) {
        viewModel.onEvent(UiAction.OnLastNameChange("H"))
        viewModel.onEvent(UiAction.OnEmailChange("sara@example.invalid"))
        viewModel.onEvent(UiAction.OnCitySelect(AMMAN.id))
        viewModel.onEvent(UiAction.OnAreaSelect(ABDOUN.id))
    }

    @Test
    fun prefillsFromTheGuestProfileAndTheLoginNumber() = runTest(UnconfinedTestDispatcher()) {
        val state = viewModel().state.value
        assertEquals("Sara", state.firstName)
        assertEquals(Gender.FEMALE, state.gender)
        assertEquals(JORDAN, state.country)
        assertEquals("791234567", state.number)
        assertTrue(state.isNumberValid)
        assertEquals(listOf(AMMAN), state.cities)
        assertFalse(state.canSubmit)
        assertFalse(state.areaEnabled)
    }

    @Test
    fun areaDependsOnTheCityAndErrorsShowAfterSubmit() = runTest(UnconfinedTestDispatcher()) {
        val viewModel = viewModel()
        viewModel.onEvent(UiAction.OnRegisterClick)
        val submitted = viewModel.state.value
        assertTrue(submitted.showError(RegisterField.LastName))
        assertTrue(submitted.showError(RegisterField.Email))
        assertTrue(submitted.showError(RegisterField.City))
        assertFalse(submitted.showError(RegisterField.FirstName))
        viewModel.onEvent(UiAction.OnEmailChange("not-an-email"))
        assertTrue(viewModel.state.value.showError(RegisterField.Email))
        viewModel.onEvent(UiAction.OnCitySelect(AMMAN.id))
        assertEquals(listOf(AMMAN.id), locations.areaCalls)
        assertEquals(listOf(ABDOUN), viewModel.state.value.areas)
        assertTrue(viewModel.state.value.areaEnabled)
        fillAll(viewModel)
        assertTrue(viewModel.state.value.canSubmit)
    }

    @Test
    fun submitChecksThePhoneThenTheProofCompletesRegistration() = runTest(UnconfinedTestDispatcher()) {
        val viewModel = viewModel()
        val effects = mutableListOf<SideEffect>()
        backgroundScope.launch { viewModel.sideEffect.collect { effects += it } }
        fillAll(viewModel)
        viewModel.onEvent(UiAction.OnRegisterClick)
        assertEquals(listOf<SideEffect>(SideEffect.NavigateToOtp(PhoneNumber("JO", "791234567"))), effects)
        pending.publish(OtpVerified(AuthPurpose.REGISTER, PhoneNumber("JO", "791234567"), "proof"))
        assertEquals(SideEffect.NavigateHome, effects.last())
        val request = auth.registered
        assertEquals("Sara", request?.firstName)
        assertEquals(Gender.FEMALE, request?.gender)
        assertEquals("a1", request?.areaId)
        assertEquals("proof", request?.idToken)
        assertEquals("Sara", session.signedIn?.firstName)
        assertNull(pending.consume())
    }

    @Test
    fun alreadyRegisteredNumberIsReportedNotSent() = runTest(UnconfinedTestDispatcher()) {
        auth.check = AppResult.Success(PhoneCheck.ALREADY_REGISTERED)
        val viewModel = viewModel()
        val effects = mutableListOf<SideEffect>()
        backgroundScope.launch { viewModel.sideEffect.collect { effects += it } }
        fillAll(viewModel)
        viewModel.onEvent(UiAction.OnRegisterClick)
        assertEquals(listOf<SideEffect>(SideEffect.ShowError("failed")), effects)
        assertNull(auth.registered)
        viewModel.onEvent(UiAction.OnLoginClick)
        assertEquals(SideEffect.NavigateToLogin, effects.last())
    }
}
