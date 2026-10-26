package com.fab.wab.customer.feature.auth.presentation

import com.fab.wab.customer.core.domain.AppError
import com.fab.wab.customer.core.domain.AppResult
import com.fab.wab.customer.core.domain.ErrorCode
import com.fab.wab.customer.core.domain.FieldError
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
import com.fab.wab.customer.feature.auth.domain.model.AuthPurpose
import com.fab.wab.customer.feature.auth.domain.model.AuthSession
import com.fab.wab.customer.feature.auth.domain.model.InstallationInfo
import com.fab.wab.customer.feature.auth.domain.model.OTP_CODE_DETAIL_FIELD
import com.fab.wab.customer.feature.auth.domain.model.OtpPolicy
import com.fab.wab.customer.feature.auth.domain.model.OtpProof
import com.fab.wab.customer.feature.auth.domain.model.PhoneCheck
import com.fab.wab.customer.feature.auth.domain.model.PhoneNumber
import com.fab.wab.customer.feature.auth.domain.model.RegisterRequest
import com.fab.wab.customer.feature.auth.domain.repository.AuthRepository
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow

internal val OTP_PHONE = PhoneNumber("JO", "791234567")
internal const val OTP_E164 = "+962791234567"
internal const val OTP_RESEND_SECONDS = 60
internal const val OTP_EXPIRES_SECONDS = 300
internal const val OTP_LENGTH = 6
internal const val OTP_TOKEN = "otp-token-1"
private val JORDAN = Country("JO", "الأردن", "+962", null, "^7")

internal fun serverError(code: ErrorCode, status: Int, details: List<FieldError> = emptyList()): AppError =
    AppError.ServerError(code, status, null, details)

internal fun invalidCode(attemptsText: String) = serverError(
    ErrorCode.OTP_INVALID,
    UNAUTHORIZED_STATUS,
    listOf(FieldError(OTP_CODE_DETAIL_FIELD, ErrorCode.OTP_INVALID.name, attemptsText)),
)

internal const val UNAUTHORIZED_STATUS = 401

/** One verified call: which phone / purpose / code the screen sent. */
internal data class VerifyCall(val phoneE164: String, val purpose: AuthPurpose, val code: String)

internal class OtpFakeAuthRepository : AuthRepository {
    var policy: AppResult<OtpPolicy> = AppResult.Success(
        OtpPolicy(allowed = true, otpLength = OTP_LENGTH, resendAfterSeconds = OTP_RESEND_SECONDS, expiresInSeconds = OTP_EXPIRES_SECONDS),
    )
    var verifyResult: AppResult<OtpProof> = AppResult.Success(OtpProof(OTP_TOKEN, OTP_EXPIRES_SECONDS))
    var loginResult: AppResult<AuthSession> = AppResult.Success(
        AuthSession(AuthTokens("a1", "r1"), UserProfile("c1", "Omar", Gender.MALE)),
    )
    val requested = mutableListOf<Pair<String, AuthPurpose>>()
    val verified = mutableListOf<VerifyCall>()
    val loginTokens = mutableListOf<String>()

    override suspend fun checkPhone(phone: PhoneNumber, purpose: AuthPurpose): AppResult<PhoneCheck> =
        AppResult.Success(PhoneCheck.REGISTERED)

    override suspend fun requestOtp(phoneE164: String, purpose: AuthPurpose): AppResult<OtpPolicy> {
        requested += phoneE164 to purpose
        return policy
    }

    override suspend fun verifyOtp(phoneE164: String, purpose: AuthPurpose, code: String): AppResult<OtpProof> {
        verified += VerifyCall(phoneE164, purpose, code)
        return verifyResult
    }

    override suspend fun login(phone: PhoneNumber, otpToken: String, installation: InstallationInfo?): AppResult<AuthSession> {
        loginTokens += otpToken
        return loginResult
    }

    override suspend fun register(request: RegisterRequest, installation: InstallationInfo?): AppResult<AuthSession> = loginResult
    override suspend fun logout(refreshToken: String): AppResult<Unit> = AppResult.Success(Unit)
    override suspend fun changePhone(phone: PhoneNumber, otpToken: String): AppResult<UserProfile> =
        AppResult.Success(UserProfile("c1", "Sara", null))
}

internal class OtpFakeSessionStore : SessionStore {
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

internal class OtpFakeLocations : LocationsRepository {
    override suspend fun countries(refresh: Boolean): AppResult<List<Country>> = AppResult.Success(listOf(JORDAN))
    override suspend fun cities(countryCode: String, refresh: Boolean): AppResult<List<City>> = AppResult.Success(emptyList())
    override suspend fun areas(cityId: String, refresh: Boolean): AppResult<List<Area>> = AppResult.Success(emptyList())
}

internal object OtpNoConfig : AppConfigRepository {
    override val current: StateFlow<AppConfig?> = MutableStateFlow(null)
    override suspend fun refresh(): AppResult<AppConfig> = AppResult.Error(AppError.UnknownError(""))
}
