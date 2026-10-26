package com.fab.wab.customer.feature.auth.presentation

import com.fab.wab.customer.core.domain.AppError
import com.fab.wab.customer.core.domain.AppResult
import com.fab.wab.customer.core.domain.auth.AuthTokens
import com.fab.wab.customer.core.domain.session.Gender
import com.fab.wab.customer.core.domain.session.GuestProfile
import com.fab.wab.customer.core.domain.session.SessionState
import com.fab.wab.customer.core.domain.session.SessionStore
import com.fab.wab.customer.core.domain.session.UserProfile
import com.fab.wab.customer.feature.auth.domain.model.AuthPurpose
import com.fab.wab.customer.feature.auth.domain.model.AuthSession
import com.fab.wab.customer.feature.auth.domain.model.InstallationInfo
import com.fab.wab.customer.feature.auth.domain.model.InstallationLink
import com.fab.wab.customer.feature.auth.domain.model.OtpPolicy
import com.fab.wab.customer.feature.auth.domain.model.OtpProof
import com.fab.wab.customer.feature.auth.domain.model.PhoneCheck
import com.fab.wab.customer.feature.auth.domain.model.PhoneNumber
import com.fab.wab.customer.feature.auth.domain.model.RegisterRequest
import com.fab.wab.customer.feature.auth.domain.repository.AuthRepository
import com.fab.wab.customer.feature.auth.domain.repository.InstallationsRepository
import com.fab.wab.customer.feature.auth.domain.usecase.LogoutUseCase
import com.fab.wab.customer.feature.auth.domain.usecase.SetPushEnabledUseCase
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.test.runTest
import kotlin.test.Test
import kotlin.test.assertEquals
import kotlin.test.assertIs
import kotlin.test.assertTrue

private class SessionStoreFake(signedIn: Boolean) : SessionStore {
    val sessionState = MutableStateFlow<SessionState>(
        if (signedIn) SessionState.SignedIn(UserProfile("c1", "Omar", Gender.MALE)) else SessionState.Guest(GuestProfile()),
    )
    var storedTokens: AuthTokens? = if (signedIn) AuthTokens("a", "r") else null
    val pushState = MutableStateFlow(true)
    var signOuts = 0
    override val state: Flow<SessionState> = sessionState
    override val onboardingSeen: Flow<Boolean> = MutableStateFlow(true)
    override val pushEnabled: Flow<Boolean> = pushState
    override suspend fun tokens(): AuthTokens? = storedTokens
    override suspend fun signIn(tokens: AuthTokens, user: UserProfile) = Unit
    override suspend fun updateTokens(tokens: AuthTokens) = Unit
    override suspend fun updateUser(user: UserProfile) = Unit
    override suspend fun setOnboardingSeen(seen: Boolean) = Unit
    override suspend fun setGuestProfile(profile: GuestProfile) = Unit
    override suspend fun setPushEnabled(enabled: Boolean) {
        pushState.value = enabled
    }
    override suspend fun signOut() {
        signOuts += 1
        storedTokens = null
        sessionState.value = SessionState.Guest()
    }
    override suspend fun clearAll() = Unit
}

private class LogoutAuth(var result: AppResult<Unit> = AppResult.Success(Unit)) : AuthRepository {
    val loggedOut = mutableListOf<String>()
    override suspend fun checkPhone(phone: PhoneNumber, purpose: AuthPurpose): AppResult<PhoneCheck> = AppResult.Loading
    override suspend fun requestOtp(phoneE164: String, purpose: AuthPurpose): AppResult<OtpPolicy> = AppResult.Loading
    override suspend fun verifyOtp(phoneE164: String, purpose: AuthPurpose, code: String): AppResult<OtpProof> =
        AppResult.Loading
    override suspend fun login(phone: PhoneNumber, otpToken: String, installation: InstallationInfo?): AppResult<AuthSession> =
        AppResult.Loading
    override suspend fun register(request: RegisterRequest, installation: InstallationInfo?): AppResult<AuthSession> =
        AppResult.Loading
    override suspend fun logout(refreshToken: String): AppResult<Unit> {
        loggedOut += refreshToken
        return result
    }
    override suspend fun changePhone(phone: PhoneNumber, otpToken: String): AppResult<UserProfile> =
        AppResult.Success(UserProfile("c1", "Sara", null))
}

private class PushInstallations : InstallationsRepository {
    val pushCalls = mutableListOf<Boolean>()
    override suspend fun register(info: InstallationInfo, language: String): AppResult<InstallationLink> =
        AppResult.Success(InstallationLink(info.installationId, true))
    override suspend fun setPushEnabled(enabled: Boolean): AppResult<Unit> {
        pushCalls += enabled
        return AppResult.Success(Unit)
    }
}

class SessionUseCasesTest {

    @Test
    fun logoutRevokesTheRefreshTokenAndAlwaysClearsTheSession() = runTest {
        val store = SessionStoreFake(signedIn = true)
        val auth = LogoutAuth(AppResult.Error(AppError.NetworkError("offline")))
        val result = LogoutUseCase(auth, store)()
        assertIs<AppResult.Error>(result)
        assertEquals(listOf("r"), auth.loggedOut)
        assertEquals(1, store.signOuts)
        assertTrue(store.sessionState.value is SessionState.Guest)
    }

    @Test
    fun logoutWithoutTokensSkipsTheBackend() = runTest {
        val store = SessionStoreFake(signedIn = false)
        val auth = LogoutAuth()
        assertEquals(AppResult.Success(Unit), LogoutUseCase(auth, store)())
        assertTrue(auth.loggedOut.isEmpty())
        assertEquals(1, store.signOuts)
    }

    @Test
    fun pushSwitchIsStoredLocallyAndSyncedOnlyWhenSignedIn() = runTest {
        val installations = PushInstallations()
        val guest = SessionStoreFake(signedIn = false)
        SetPushEnabledUseCase(installations, guest)(false)
        assertEquals(false, guest.pushState.value)
        assertTrue(installations.pushCalls.isEmpty())
        val registered = SessionStoreFake(signedIn = true)
        SetPushEnabledUseCase(installations, registered)(false)
        assertEquals(listOf(false), installations.pushCalls)
    }
}
