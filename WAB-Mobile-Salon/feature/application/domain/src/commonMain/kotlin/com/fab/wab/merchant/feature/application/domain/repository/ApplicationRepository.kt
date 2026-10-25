package com.fab.wab.merchant.feature.application.domain.repository

import com.fab.wab.merchant.core.domain.AppResult
import com.fab.wab.merchant.core.domain.auth.AuthTokens
import com.fab.wab.merchant.core.domain.session.MemberProfile
import com.fab.wab.merchant.feature.application.domain.model.RegistrationForm
import com.fab.wab.merchant.feature.application.domain.model.SalonApplication
import com.fab.wab.merchant.feature.auth.domain.model.InstallationInfo
import com.fab.wab.merchant.feature.auth.domain.model.PhoneNumber

/**
 * The owner session created by `POST /salon/applications` (the owner is signed in right away). Since contract 1.4.0
 * (SRV-151) the answer's `member` is the shared `MemberProfile`, so the owner and the permission keys come from the server.
 */
data class ApplicationSession(
    val tokens: AuthTokens,
    val member: MemberProfile,
    val permissions: Set<String>,
    val application: SalonApplication,
)

interface ApplicationRepository {
    suspend fun apply(
        form: RegistrationForm,
        phone: PhoneNumber,
        idToken: String,
        installation: InstallationInfo?,
    ): AppResult<ApplicationSession>

    suspend fun current(): AppResult<SalonApplication>

    suspend fun resubmit(form: RegistrationForm): AppResult<SalonApplication>
}
