package com.fab.wab.customer.feature.auth.presentation

import com.fab.wab.customer.core.analytics.NoOpAnalyticsTracker
import com.fab.wab.customer.core.domain.AppError
import com.fab.wab.customer.core.domain.AppLanguage
import com.fab.wab.customer.core.domain.AppResult
import com.fab.wab.customer.core.domain.AppSettings
import com.fab.wab.customer.core.domain.AppearanceSettings
import com.fab.wab.customer.core.domain.ThemeMode
import com.fab.wab.customer.core.domain.locations.Area
import com.fab.wab.customer.core.domain.locations.City
import com.fab.wab.customer.core.domain.locations.Country
import com.fab.wab.customer.core.domain.locations.LocationsRepository
import com.fab.wab.customer.feature.auth.domain.model.AuthPurpose
import com.fab.wab.customer.feature.auth.domain.model.AuthSession
import com.fab.wab.customer.feature.auth.domain.model.InstallationInfo
import com.fab.wab.customer.feature.auth.domain.model.OtpPolicy
import com.fab.wab.customer.feature.auth.domain.model.WrongAttemptResult
import com.fab.wab.customer.feature.auth.domain.model.PhoneCheck
import com.fab.wab.customer.feature.auth.domain.model.PhoneNumber
import com.fab.wab.customer.feature.auth.domain.model.RegisterRequest
import com.fab.wab.customer.feature.auth.domain.repository.AuthRepository
import com.fab.wab.customer.feature.auth.domain.usecase.CheckPhoneUseCase
import com.fab.wab.customer.feature.auth.presentation.controller.contract.LegalSlugs
import com.fab.wab.customer.feature.auth.presentation.controller.contract.LoginContract.LoginDialog
import com.fab.wab.customer.feature.auth.presentation.controller.contract.LoginContract.SideEffect
import com.fab.wab.customer.feature.auth.presentation.controller.contract.LoginContract.UiAction
import com.fab.wab.customer.feature.auth.presentation.controller.vm.LoginViewModel
import kotlinx.coroutines.ExperimentalCoroutinesApi
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.first
import kotlinx.coroutines.launch
import kotlinx.coroutines.test.UnconfinedTestDispatcher
import kotlinx.coroutines.test.runTest
import kotlin.test.Test
import kotlin.test.assertEquals
import kotlin.test.assertFalse
import kotlin.test.assertNull
import kotlin.test.assertTrue

private val JORDAN = Country("JO", "الأردن", "+962", null, "^7[789]\\d{7}$")
private val SAUDI = Country("SA", "السعودية", "+966", null, "^5\\d{8}$")

private class FakeLocations(var result: AppResult<List<Country>> = AppResult.Success(listOf(SAUDI, JORDAN))) : LocationsRepository {
    var calls = 0
    override suspend fun countries(refresh: Boolean): AppResult<List<Country>> {
        calls += 1
        return result
    }
    override suspend fun cities(countryCode: String, refresh: Boolean): AppResult<List<City>> = AppResult.Success(emptyList())
    override suspend fun areas(cityId: String, refresh: Boolean): AppResult<List<Area>> = AppResult.Success(emptyList())
}

private class FakeAuth(var result: AppResult<PhoneCheck> = AppResult.Success(PhoneCheck.REGISTERED)) : AuthRepository {
    val checked = mutableListOf<PhoneNumber>()
    override suspend fun checkPhone(phone: PhoneNumber, purpose: AuthPurpose): AppResult<PhoneCheck> {
        checked += phone
        return result
    }
    override suspend fun requestOtp(phoneE164: String, purpose: AuthPurpose): AppResult<OtpPolicy> = AppResult.Loading
    override suspend fun reportWrongAttempt(phoneE164: String): AppResult<WrongAttemptResult> = AppResult.Loading
    override suspend fun login(phone: PhoneNumber, idToken: String, installation: InstallationInfo?): AppResult<AuthSession> =
        AppResult.Loading
    override suspend fun register(request: RegisterRequest, installation: InstallationInfo?): AppResult<AuthSession> =
        AppResult.Loading
}

private class SettingsFake : AppSettings {
    val languageState = MutableStateFlow(AppLanguage.DEFAULT.code)
    val themeState = MutableStateFlow(ThemeMode.SYSTEM)
    private val text = MutableStateFlow<String?>(null)
    override val language: Flow<String> = languageState
    override val themeMode: Flow<ThemeMode> = themeState
    override val token: Flow<String?> = text
    override val fcmToken: Flow<String?> = text
    override val refreshToken: Flow<String?> = text
    override val userId: Flow<String?> = text
    override val userRole: Flow<String?> = text
    override val userName: Flow<String?> = text
    override val onboardingCompleted: Flow<Boolean> = MutableStateFlow(false)
    override val lastSyncTimestamp: Flow<Long?> = MutableStateFlow(null)
    override val deviceId: Flow<String?> = text
    override suspend fun setLanguage(language: String) {
        languageState.value = language
    }
    override suspend fun setThemeMode(mode: ThemeMode) {
        themeState.value = mode
    }
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
class LoginViewModelTest {

    private val locations = FakeLocations()
    private val auth = FakeAuth()
    private val settings = SettingsFake()

    private fun kotlinx.coroutines.test.TestScope.viewModel() = LoginViewModel(
        checkPhone = CheckPhoneUseCase(auth),
        locations = locations,
        appearance = AppearanceSettings(settings),
        analytics = NoOpAnalyticsTracker,
        errorText = { "failed" },
        testScope = backgroundScope,
    )

    @Test
    fun jordanIsSelectedByDefaultAndTheNumberIsValidatedWithItsRegex() = runTest(UnconfinedTestDispatcher()) {
        val viewModel = viewModel()
        val loaded = viewModel.state.first { !it.countriesLoading }
        assertEquals(JORDAN, loaded.country)
        assertFalse(loaded.canSubmit)
        viewModel.onEvent(UiAction.OnNumberChange("5512"))
        assertTrue(viewModel.state.first().showNumberError)
        viewModel.onEvent(UiAction.OnNumberChange("0791234567"))
        assertTrue(viewModel.state.first().canSubmit)
        viewModel.onEvent(UiAction.OnCountryClick)
        viewModel.onEvent(UiAction.OnCountrySelect("SA"))
        val switched = viewModel.state.first()
        assertEquals(SAUDI, switched.country)
        assertFalse(switched.pickerOpen)
        assertFalse(switched.canSubmit)
    }

    @Test
    fun registeredNumberGoesToOtpWithTheNormalizedNumber() = runTest(UnconfinedTestDispatcher()) {
        val viewModel = viewModel()
        val effects = mutableListOf<SideEffect>()
        backgroundScope.launch { viewModel.sideEffect.collect { effects += it } }
        viewModel.state.first { !it.countriesLoading }
        viewModel.onEvent(UiAction.OnNumberChange("079 123-4567"))
        viewModel.onEvent(UiAction.OnLoginClick)
        assertEquals(listOf<SideEffect>(SideEffect.NavigateToOtp(PhoneNumber("JO", "791234567"))), effects)
        assertEquals(PhoneNumber("JO", "791234567"), auth.checked.single())
        assertFalse(viewModel.state.first().submitting)
    }

    @Test
    fun notRegisteredShowsThePopupAndRegisterPrefillsThePhone() = runTest(UnconfinedTestDispatcher()) {
        auth.result = AppResult.Success(PhoneCheck.NOT_REGISTERED)
        val viewModel = viewModel()
        val effects = mutableListOf<SideEffect>()
        backgroundScope.launch { viewModel.sideEffect.collect { effects += it } }
        viewModel.state.first { !it.countriesLoading }
        viewModel.onEvent(UiAction.OnNumberChange("791234567"))
        viewModel.onEvent(UiAction.OnLoginClick)
        assertEquals(LoginDialog.NotRegistered, viewModel.state.first().dialog)
        viewModel.onEvent(UiAction.OnDialogConfirm)
        assertNull(viewModel.state.first().dialog)
        assertEquals(listOf<SideEffect>(SideEffect.NavigateToRegister(PhoneNumber("JO", "791234567"))), effects)
    }

    @Test
    fun blockedAccountOffersContactAndErrorsAreShown() = runTest(UnconfinedTestDispatcher()) {
        auth.result = AppResult.Success(PhoneCheck.BLOCKED)
        val viewModel = viewModel()
        val effects = mutableListOf<SideEffect>()
        backgroundScope.launch { viewModel.sideEffect.collect { effects += it } }
        viewModel.state.first { !it.countriesLoading }
        viewModel.onEvent(UiAction.OnNumberChange("791234567"))
        viewModel.onEvent(UiAction.OnLoginClick)
        assertEquals(LoginDialog.Blocked, viewModel.state.first().dialog)
        viewModel.onEvent(UiAction.OnDialogConfirm)
        assertEquals(SideEffect.OpenContent(LegalSlugs.CONTACT), effects.last())
        auth.result = AppResult.Error(AppError.NetworkError("offline"))
        viewModel.onEvent(UiAction.OnLoginClick)
        assertEquals(SideEffect.ShowError("failed"), effects.last())
    }

    @Test
    fun languageAndThemeTogglesPersistAndReloadCountries() = runTest(UnconfinedTestDispatcher()) {
        val viewModel = viewModel()
        viewModel.state.first { !it.countriesLoading }
        assertEquals(1, locations.calls)
        viewModel.onEvent(UiAction.OnLanguageToggle)
        assertEquals(AppLanguage.ENGLISH.code, settings.languageState.value)
        assertEquals(2, locations.calls)
        viewModel.onEvent(UiAction.OnThemeToggle)
        assertEquals(ThemeMode.DARK, settings.themeState.value)
        assertEquals(ThemeMode.DARK, viewModel.state.first().themeMode)
        viewModel.onEvent(UiAction.OnThemeToggle)
        assertEquals(ThemeMode.LIGHT, settings.themeState.value)
    }

    @Test
    fun countriesFailureShowsRetry() = runTest(UnconfinedTestDispatcher()) {
        locations.result = AppResult.Error(AppError.NetworkError("offline"))
        val viewModel = viewModel()
        assertEquals("failed", viewModel.state.first { !it.countriesLoading }.countriesError)
        locations.result = AppResult.Success(listOf(JORDAN))
        viewModel.onEvent(UiAction.OnRetryCountries)
        assertEquals(JORDAN, viewModel.state.first { it.countriesError == null && !it.countriesLoading }.country)
    }
}
