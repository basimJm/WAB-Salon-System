package com.fab.wab.merchant.feature.application.domain.usecase

import com.fab.wab.merchant.core.domain.AppResult
import com.fab.wab.merchant.core.domain.permission.Permission
import com.fab.wab.merchant.core.domain.session.MemberProfile
import com.fab.wab.merchant.core.domain.session.MemberRole
import com.fab.wab.merchant.core.domain.session.SessionStore
import com.fab.wab.merchant.feature.application.domain.model.RegistrationForm
import com.fab.wab.merchant.feature.application.domain.model.SalonApplication
import com.fab.wab.merchant.feature.application.domain.repository.ApplicationRepository
import com.fab.wab.merchant.feature.application.domain.repository.ApplicationSession
import com.fab.wab.merchant.feature.auth.domain.model.OtpVerified
import com.fab.wab.merchant.feature.auth.domain.repository.InstallationInfoProvider

/**
 * PRD M04 submit: creates the salon (`APPLICATION_PENDING`) and its owner with the REGISTER proof, then signs the
 * owner in (the owner holds every permission) with the salon state, so the launch router opens M05.
 */
class SubmitApplicationUseCase(
    private val repository: ApplicationRepository,
    private val installation: InstallationInfoProvider,
    private val sessionStore: SessionStore,
) {
    suspend operator fun invoke(form: RegistrationForm, proof: OtpVerified): AppResult<ApplicationSession> {
        val result = repository.apply(form, proof.phone, proof.idToken, installation.current())
        if (result is AppResult.Success) {
            val session = result.data
            val owner = MemberProfile(id = session.memberId, salonId = session.salonId, firstName = form.firstName, role = MemberRole.OWNER)
            sessionStore.signIn(session.tokens, owner, Permission.entries.map { it.name }.toSet(), session.application.state)
        }
        return result
    }
}

/** PRD M05: the current application; the cached salon state follows it (approval moves the router on). */
class GetApplicationUseCase(private val repository: ApplicationRepository, private val sessionStore: SessionStore) {
    suspend operator fun invoke(): AppResult<SalonApplication> {
        val result = repository.current()
        if (result is AppResult.Success) sessionStore.updateSalonState(result.data.state)
        return result
    }
}

/** PRD M05 "Edit & resubmit": back to pending with the corrected details and documents. */
class ResubmitApplicationUseCase(private val repository: ApplicationRepository, private val sessionStore: SessionStore) {
    suspend operator fun invoke(form: RegistrationForm): AppResult<SalonApplication> {
        val result = repository.resubmit(form)
        if (result is AppResult.Success) sessionStore.updateSalonState(result.data.state)
        return result
    }
}
