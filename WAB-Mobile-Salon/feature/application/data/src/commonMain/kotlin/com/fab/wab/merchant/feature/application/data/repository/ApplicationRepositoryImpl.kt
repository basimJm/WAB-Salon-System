package com.fab.wab.merchant.feature.application.data.repository

import com.fab.wab.merchant.core.data.contract.generated.GetSalonApplicationData
import com.fab.wab.merchant.core.data.contract.generated.MemberProfile as MemberDto
import com.fab.wab.merchant.core.data.contract.generated.PostSalonApplicationResubmitBody
import com.fab.wab.merchant.core.data.contract.generated.PostSalonApplicationResubmitData
import com.fab.wab.merchant.core.data.contract.generated.PostSalonApplicationsBody
import com.fab.wab.merchant.core.data.contract.generated.PostSalonApplicationsBodyInstallation
import com.fab.wab.merchant.core.data.contract.generated.PostSalonApplicationsBodyPhone
import com.fab.wab.merchant.core.data.contract.generated.PostSalonApplicationsBodySalon
import com.fab.wab.merchant.core.data.contract.generated.PostSalonApplicationsData
import com.fab.wab.merchant.core.data.contract.generated.PostSalonApplicationsDataApplication
import com.fab.wab.merchant.core.domain.AppResult
import com.fab.wab.merchant.core.domain.auth.AuthTokens
import com.fab.wab.merchant.core.domain.mapSuccess
import com.fab.wab.merchant.core.domain.session.MemberProfile
import com.fab.wab.merchant.core.domain.session.MemberRole
import com.fab.wab.merchant.core.domain.session.SalonState
import com.fab.wab.merchant.core.network.safeApiCall
import com.fab.wab.merchant.feature.application.data.remote.ApplicationApi
import com.fab.wab.merchant.feature.application.domain.model.RegistrationForm
import com.fab.wab.merchant.feature.application.domain.model.SalonApplication
import com.fab.wab.merchant.feature.application.domain.repository.ApplicationRepository
import com.fab.wab.merchant.feature.application.domain.repository.ApplicationSession
import com.fab.wab.merchant.feature.auth.domain.model.InstallationInfo
import com.fab.wab.merchant.feature.auth.domain.model.PhoneNumber
import kotlin.time.Instant

class ApplicationRepositoryImpl(private val api: ApplicationApi) : ApplicationRepository {
    override suspend fun apply(
        form: RegistrationForm,
        phone: PhoneNumber,
        otpToken: String,
        installation: InstallationInfo?,
    ): AppResult<ApplicationSession> {
        val body = form.toApplyBody(phone, otpToken, installation ?: InstallationInfo.UNKNOWN_INSTALLATION)
        return safeApiCall { api.apply(body) }.mapSuccess { it.data.toDomain() }
    }

    override suspend fun current(): AppResult<SalonApplication> = safeApiCall { api.current() }.mapSuccess { it.data.toDomain() }

    override suspend fun resubmit(form: RegistrationForm): AppResult<SalonApplication> =
        safeApiCall { api.resubmit(form.toResubmitBody()) }.mapSuccess { it.data.toDomain() }
}

/** Unknown states read as pending (the app shows the review screen instead of guessing approval). */
private fun stateOf(code: String): SalonState = SalonState.fromCode(code) ?: SalonState.APPLICATION_PENDING

private fun instantOrNull(value: String): Instant? = runCatching { Instant.parse(value) }.getOrNull()

fun RegistrationForm.toApplyBody(phone: PhoneNumber, otpToken: String, installation: InstallationInfo) = PostSalonApplicationsBody(
    phone = PostSalonApplicationsBodyPhone(countryCode = phone.countryCode, number = phone.number),
    otpToken = otpToken,
    firstName = firstName,
    lastName = lastName,
    salon = PostSalonApplicationsBodySalon(
        name = salonName,
        gender = gender.code,
        description = description,
        cityId = cityId,
        areaId = areaId,
    ),
    documentKeys = documentKeys,
    installation = PostSalonApplicationsBodyInstallation(
        installationId = installation.installationId,
        platform = installation.platform,
        appVersion = installation.appVersion,
        osVersion = installation.osVersion,
        deviceModel = installation.deviceModel,
        fcmToken = installation.fcmToken,
    ),
)

fun RegistrationForm.toResubmitBody() =
    PostSalonApplicationResubmitBody(name = salonName, gender = gender.code, description = description, documentKeys = documentKeys)

fun PostSalonApplicationsData.toDomain() = ApplicationSession(
    tokens = AuthTokens(accessToken = accessToken, refreshToken = refreshToken),
    member = member.toDomain(),
    permissions = member.permissions.toSet(),
    application = application.toDomain(),
)

/** The application answer's `MemberProfile` (contract 1.4.0); an unknown role reads as the most restricted one, like sign-in. */
fun MemberDto.toDomain(): MemberProfile = MemberProfile(
    id = id,
    salonId = salonId,
    firstName = firstName,
    role = MemberRole.fromCode(role) ?: MemberRole.EMPLOYEE,
    branchId = branchId,
)

fun PostSalonApplicationsDataApplication.toDomain() =
    SalonApplication(
        salonId,
        stateOf(state),
        instantOrNull(submittedAt),
        resubmissionCount.toInt(),
        rejectionReason?.takeIf { it.isNotBlank() },
    )

fun GetSalonApplicationData.toDomain() =
    SalonApplication(
        salonId,
        stateOf(state),
        instantOrNull(submittedAt),
        resubmissionCount.toInt(),
        rejectionReason?.takeIf { it.isNotBlank() },
    )

fun PostSalonApplicationResubmitData.toDomain() =
    SalonApplication(
        salonId,
        stateOf(state),
        instantOrNull(submittedAt),
        resubmissionCount.toInt(),
        rejectionReason?.takeIf { it.isNotBlank() },
    )
