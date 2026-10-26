package com.fab.wab.merchant.feature.auth.presentation

import com.fab.wab.merchant.core.domain.AppError
import com.fab.wab.merchant.core.domain.AppResult
import com.fab.wab.merchant.core.domain.auth.AuthTokens
import com.fab.wab.merchant.core.domain.session.MemberProfile
import com.fab.wab.merchant.core.domain.session.MemberRole
import com.fab.wab.merchant.core.domain.session.SalonState
import com.fab.wab.merchant.core.domain.session.SessionState
import com.fab.wab.merchant.core.domain.session.SessionStore
import com.fab.wab.merchant.feature.auth.domain.model.AuthPurpose
import com.fab.wab.merchant.feature.auth.domain.model.AuthSession
import com.fab.wab.merchant.feature.auth.domain.model.InstallationInfo
import com.fab.wab.merchant.feature.auth.domain.model.OtpPolicy
import com.fab.wab.merchant.feature.auth.domain.model.OtpProof
import com.fab.wab.merchant.feature.auth.domain.model.PhoneCheck
import com.fab.wab.merchant.feature.auth.domain.model.PhoneNumber
import com.fab.wab.merchant.feature.auth.domain.repository.AuthRepository
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.MutableStateFlow

internal val OWNER = MemberProfile(id = "m1", salonId = "s1", firstName = "Omar", role = MemberRole.OWNER)

internal const val TEST_OTP_LENGTH = 6
internal const val TEST_RESEND_SECONDS = 60
internal const val TEST_EXPIRES_SECONDS = 300
internal const val TEST_PROOF_SECONDS = 600
internal const val TEST_OTP_TOKEN = "otp-token"

/** Auth repository with a configurable answer per call; records what the view models sent. */
internal class FakeAuthRepository : AuthRepository {
    var check: AppResult<PhoneCheck> = AppResult.Success(PhoneCheck.REGISTERED)
    var policy = OtpPolicy(
        allowed = true, otpLength = TEST_OTP_LENGTH, resendAfterSeconds = TEST_RESEND_SECONDS, expiresInSeconds = TEST_EXPIRES_SECONDS,
    )
    var requestError: AppError? = null
    var verifyResult: AppResult<OtpProof> = AppResult.Success(OtpProof(TEST_OTP_TOKEN, TEST_PROOF_SECONDS))
    var loginResult: AppResult<AuthSession> = AppResult.Success(AuthSession(AuthTokens("a1", "r1"), OWNER, setOf("DASHBOARD_VIEW")))
    var logoutResult: AppResult<Unit> = AppResult.Success(Unit)
    val checked = mutableListOf<PhoneNumber>()
    val requested = mutableListOf<String>()
    val verified = mutableListOf<Pair<AuthPurpose, String>>()
    val loggedInWith = mutableListOf<String>()
    val loggedOut = mutableListOf<String>()

    override suspend fun checkPhone(phone: PhoneNumber): AppResult<PhoneCheck> {
        checked += phone
        return check
    }

    override suspend fun requestOtp(phoneE164: String, purpose: AuthPurpose): AppResult<OtpPolicy> {
        requested += phoneE164
        return requestError?.let { AppResult.Error(it) } ?: AppResult.Success(policy)
    }

    override suspend fun verifyOtp(phoneE164: String, purpose: AuthPurpose, code: String): AppResult<OtpProof> {
        verified += purpose to code
        return verifyResult
    }

    override suspend fun login(phone: PhoneNumber, otpToken: String, installation: InstallationInfo?): AppResult<AuthSession> {
        loggedInWith += otpToken
        return loginResult
    }

    override suspend fun logout(refreshToken: String): AppResult<Unit> {
        loggedOut += refreshToken
        return logoutResult
    }
}

/** Merchant session store keeping only what the auth flow writes. */
internal class FakeSessionStore(signedIn: Boolean = false) : SessionStore {
    val sessionState = MutableStateFlow<SessionState>(if (signedIn) SessionState.SignedIn(OWNER) else SessionState.Guest)
    var storedTokens: AuthTokens? = if (signedIn) AuthTokens("a", "r") else null
    var signedInMember: MemberProfile? = null
    var signedInPermissions: Set<String> = emptySet()
    var signOuts = 0

    override val state: Flow<SessionState> = sessionState
    override val pushEnabled: Flow<Boolean> = MutableStateFlow(true)
    override val overlayPermissionPrompted: Flow<Boolean> = MutableStateFlow(false)
    override suspend fun tokens(): AuthTokens? = storedTokens
    override suspend fun signIn(tokens: AuthTokens, member: MemberProfile, permissions: Set<String>, salonState: SalonState?) {
        storedTokens = tokens
        signedInMember = member
        signedInPermissions = permissions
        sessionState.value = SessionState.SignedIn(member, permissions, salonState)
    }
    override suspend fun updateTokens(tokens: AuthTokens) = Unit
    override suspend fun updateMember(member: MemberProfile) = Unit
    override suspend fun updatePermissions(permissions: Set<String>) = Unit
    override suspend fun updateSalonState(salonState: SalonState?) = Unit
    override suspend fun setPushEnabled(enabled: Boolean) = Unit
    override suspend fun setOverlayPermissionPrompted(prompted: Boolean) = Unit
    override suspend fun signOut() {
        signOuts += 1
        storedTokens = null
        sessionState.value = SessionState.Guest
    }
    override suspend fun clearAll() = Unit
}
