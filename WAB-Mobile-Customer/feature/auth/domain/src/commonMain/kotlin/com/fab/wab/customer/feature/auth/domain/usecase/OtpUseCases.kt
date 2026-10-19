package com.fab.wab.customer.feature.auth.domain.usecase

import com.fab.wab.customer.core.domain.AppResult
import com.fab.wab.customer.core.domain.locations.LocationsRepository
import com.fab.wab.customer.core.domain.mapSuccess
import com.fab.wab.customer.core.domain.session.SessionStore
import com.fab.wab.customer.feature.auth.domain.model.AuthPurpose
import com.fab.wab.customer.feature.auth.domain.model.AuthSession
import com.fab.wab.customer.feature.auth.domain.model.OtpPolicy
import com.fab.wab.customer.feature.auth.domain.model.PhoneNumber
import com.fab.wab.customer.feature.auth.domain.model.RegisterRequest
import com.fab.wab.customer.feature.auth.domain.model.WrongAttemptResult
import com.fab.wab.customer.feature.auth.domain.repository.AuthRepository
import com.fab.wab.customer.feature.auth.domain.repository.InstallationInfoProvider

class RequestOtpUseCase(private val repository: AuthRepository) {
    suspend operator fun invoke(phoneE164: String, purpose: AuthPurpose): AppResult<OtpPolicy> =
        repository.requestOtp(phoneE164, purpose)
}

class ReportWrongOtpAttemptUseCase(private val repository: AuthRepository) {
    suspend operator fun invoke(phoneE164: String): AppResult<WrongAttemptResult> = repository.reportWrongAttempt(phoneE164)
}

/** Login with the Firebase proof, then persist the session (PRD S13 "save tokens + first name + gender"). */
class LoginWithIdTokenUseCase(
    private val repository: AuthRepository,
    private val installation: InstallationInfoProvider,
    private val sessionStore: SessionStore,
) {
    suspend operator fun invoke(phone: PhoneNumber, idToken: String): AppResult<AuthSession> {
        val result = repository.login(phone, idToken, installation.current())
        if (result is AppResult.Success) sessionStore.signIn(result.data.tokens, result.data.user)
        return result
    }
}

/** Register with the Firebase proof, then persist the session (PRD S12 "store tokens, first name, gender → Home"). */
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
