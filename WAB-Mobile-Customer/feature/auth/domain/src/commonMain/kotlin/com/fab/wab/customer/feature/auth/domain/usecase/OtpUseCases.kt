package com.fab.wab.customer.feature.auth.domain.usecase

import com.fab.wab.customer.core.domain.AppResult
import com.fab.wab.customer.core.domain.locations.LocationsRepository
import com.fab.wab.customer.core.domain.mapSuccess
import com.fab.wab.customer.core.domain.session.SessionStore
import com.fab.wab.customer.feature.auth.domain.model.AuthPurpose
import com.fab.wab.customer.feature.auth.domain.model.AuthSession
import com.fab.wab.customer.feature.auth.domain.model.OtpPolicy
import com.fab.wab.customer.feature.auth.domain.model.OtpProof
import com.fab.wab.customer.feature.auth.domain.model.PhoneNumber
import com.fab.wab.customer.feature.auth.domain.model.RegisterRequest
import com.fab.wab.customer.feature.auth.domain.repository.AuthRepository
import com.fab.wab.customer.feature.auth.domain.repository.InstallationInfoProvider

/** Limits check + WhatsApp send in one server call (BUSINESS_DOMAIN §3.1a). */
class RequestOtpUseCase(private val repository: AuthRepository) {
    suspend operator fun invoke(phoneE164: String, purpose: AuthPurpose): AppResult<OtpPolicy> =
        repository.requestOtp(phoneE164, purpose)
}

/** Checks the typed code on the server; success = the single-use `otpToken` for [purpose]. */
class VerifyOtpUseCase(private val repository: AuthRepository) {
    suspend operator fun invoke(phoneE164: String, purpose: AuthPurpose, code: String): AppResult<OtpProof> =
        repository.verifyOtp(phoneE164, purpose, code)
}

/** Login with the OTP token, then persist the session (PRD S13 "save tokens + first name + gender"). */
class LoginWithOtpTokenUseCase(
    private val repository: AuthRepository,
    private val installation: InstallationInfoProvider,
    private val sessionStore: SessionStore,
) {
    suspend operator fun invoke(phone: PhoneNumber, otpToken: String): AppResult<AuthSession> {
        val result = repository.login(phone, otpToken, installation.current())
        if (result is AppResult.Success) sessionStore.signIn(result.data.tokens, result.data.user)
        return result
    }
}

/** Register with the OTP token, then persist the session (PRD S12 "store tokens, first name, gender → Home"). */
class RegisterUseCase(
    private val repository: AuthRepository,
    private val installation: InstallationInfoProvider,
    private val sessionStore: SessionStore,
) {
    suspend operator fun invoke(request: RegisterRequest): AppResult<AuthSession> {
        val result = repository.register(request, installation.current())
        if (result is AppResult.Success) sessionStore.signIn(result.data.tokens, result.data.user)
        return result
    }
}

/** The dial code of a stored country code, from the cached countries (PRD S13 shows the full number). */
class ResolveDialCodeUseCase(private val locations: LocationsRepository) {
    suspend operator fun invoke(countryCode: String): AppResult<String?> =
        locations.countries().mapSuccess { list -> list.firstOrNull { it.code.equals(countryCode, ignoreCase = true) }?.dialCode }
}
