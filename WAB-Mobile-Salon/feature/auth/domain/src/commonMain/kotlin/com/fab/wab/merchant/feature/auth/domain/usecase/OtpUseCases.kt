package com.fab.wab.merchant.feature.auth.domain.usecase

import com.fab.wab.merchant.core.domain.AppResult
import com.fab.wab.merchant.core.domain.locations.LocationsRepository
import com.fab.wab.merchant.core.domain.mapSuccess
import com.fab.wab.merchant.core.domain.session.SessionStore
import com.fab.wab.merchant.feature.auth.domain.model.AuthPurpose
import com.fab.wab.merchant.feature.auth.domain.model.AuthSession
import com.fab.wab.merchant.feature.auth.domain.model.OtpPolicy
import com.fab.wab.merchant.feature.auth.domain.model.OtpProof
import com.fab.wab.merchant.feature.auth.domain.model.PhoneNumber
import com.fab.wab.merchant.feature.auth.domain.repository.AuthRepository
import com.fab.wab.merchant.feature.auth.domain.repository.InstallationInfoProvider

class RequestOtpUseCase(private val repository: AuthRepository) {
    suspend operator fun invoke(phoneE164: String, purpose: AuthPurpose): AppResult<OtpPolicy> =
        repository.requestOtp(phoneE164, purpose)
}

/** The typed WhatsApp code against the backend; a right code answers the single-use `otpToken`. */
class VerifyOtpUseCase(private val repository: AuthRepository) {
    suspend operator fun invoke(phoneE164: String, purpose: AuthPurpose, code: String): AppResult<OtpProof> =
        repository.verifyOtp(phoneE164, purpose, code)
}

/** Login with the `otpToken`, then persist the session (PRD §5: tokens, member, role, permission keys). */
class LoginWithOtpTokenUseCase(
    private val repository: AuthRepository,
    private val installation: InstallationInfoProvider,
    private val sessionStore: SessionStore,
) {
    suspend operator fun invoke(phone: PhoneNumber, otpToken: String): AppResult<AuthSession> {
        val result = repository.login(phone, otpToken, installation.current())
        if (result is AppResult.Success) {
            sessionStore.signIn(result.data.tokens, result.data.member, result.data.permissions, salonState = null)
        }
        return result
    }
}

/** The dial code of a stored country code, from the cached countries (PRD M03 shows the full number). */
class ResolveDialCodeUseCase(private val locations: LocationsRepository) {
    suspend operator fun invoke(countryCode: String): AppResult<String?> =
        locations.countries().mapSuccess { list -> list.firstOrNull { it.code.equals(countryCode, ignoreCase = true) }?.dialCode }
}
