package com.fab.wab.merchant.feature.application.presentation

import com.fab.wab.merchant.core.domain.AppResult
import com.fab.wab.merchant.core.domain.auth.AuthTokens
import com.fab.wab.merchant.core.domain.locations.Area
import com.fab.wab.merchant.core.domain.locations.City
import com.fab.wab.merchant.core.domain.locations.Country
import com.fab.wab.merchant.core.domain.locations.LocationsRepository
import com.fab.wab.merchant.core.domain.session.MemberProfile
import com.fab.wab.merchant.core.domain.session.SalonState
import com.fab.wab.merchant.core.domain.session.SessionState
import com.fab.wab.merchant.core.domain.session.SessionStore
import com.fab.wab.merchant.core.domain.upload.ConfirmedUpload
import com.fab.wab.merchant.core.domain.upload.PresignedUpload
import com.fab.wab.merchant.core.domain.upload.UploadPurpose
import com.fab.wab.merchant.core.domain.upload.UploadsRepository
import com.fab.wab.merchant.feature.application.domain.model.RegistrationForm
import com.fab.wab.merchant.feature.application.domain.model.SalonApplication
import com.fab.wab.merchant.feature.application.domain.repository.ApplicationRepository
import com.fab.wab.merchant.feature.application.domain.repository.ApplicationSession
import com.fab.wab.merchant.feature.auth.domain.model.InstallationInfo
import com.fab.wab.merchant.feature.auth.domain.model.PhoneNumber
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.MutableStateFlow

internal val PENDING_APPLICATION = SalonApplication("s1", SalonState.APPLICATION_PENDING, null, 0, null)

internal class FakeApplications : ApplicationRepository {
    var applyResult: AppResult<ApplicationSession> =
        AppResult.Success(ApplicationSession(AuthTokens("a", "r"), "m1", "s1", PENDING_APPLICATION))
    var current: AppResult<SalonApplication> = AppResult.Success(PENDING_APPLICATION)
    val applied = mutableListOf<RegistrationForm>()
    val resubmitted = mutableListOf<RegistrationForm>()

    override suspend fun apply(form: RegistrationForm, phone: PhoneNumber, idToken: String, installation: InstallationInfo?) =
        applyResult.also { applied += form }

    override suspend fun current() = current

    override suspend fun resubmit(form: RegistrationForm): AppResult<SalonApplication> =
        AppResult.Success(PENDING_APPLICATION).also { resubmitted += form }
}

internal class FakeLocations : LocationsRepository {
    val requestedCities = mutableListOf<String>()
    override suspend fun countries(refresh: Boolean): AppResult<List<Country>> = AppResult.Success(emptyList())
    override suspend fun cities(countryCode: String, refresh: Boolean): AppResult<List<City>> =
        AppResult.Success(listOf(City("c1", "Amman"), City("c2", "Irbid"))).also { requestedCities += countryCode }
    override suspend fun areas(
        cityId: String,
        refresh: Boolean,
    ): AppResult<List<Area>> = AppResult.Success(listOf(Area("$cityId-a1", "Abdoun")))
}

internal class FakeUploads(var fail: Boolean = false) : UploadsRepository {
    override suspend fun presign(purpose: UploadPurpose, contentType: String, size: Long): AppResult<PresignedUpload> =
        AppResult.Success(PresignedUpload("key-$size", "u", "PUT", emptyMap(), size))
    override suspend fun upload(
        target: PresignedUpload,
        bytes: ByteArray,
        contentType: String,
        onProgress: (Float) -> Unit,
    ): AppResult<Unit> =
        if (fail) AppResult.Error(com.fab.wab.merchant.core.domain.AppError.HttpError(403, null)) else AppResult.Success(Unit)
    override suspend fun confirm(
        purpose: UploadPurpose,
        key: String,
    ): AppResult<ConfirmedUpload> = AppResult.Success(ConfirmedUpload(key, null))
}

internal class RecordingSessionStore : SessionStore {
    var member: MemberProfile? = null
    var salonState: SalonState? = null
    override val state: Flow<SessionState> = MutableStateFlow(SessionState.Guest)
    override val pushEnabled: Flow<Boolean> = MutableStateFlow(true)
    override val overlayPermissionPrompted: Flow<Boolean> = MutableStateFlow(false)
    override suspend fun tokens(): AuthTokens? = null
    override suspend fun signIn(tokens: AuthTokens, member: MemberProfile, permissions: Set<String>, salonState: SalonState?) {
        this.member = member
        this.salonState = salonState
    }
    override suspend fun updateTokens(tokens: AuthTokens) = Unit
    override suspend fun updateMember(member: MemberProfile) = Unit
    override suspend fun updatePermissions(permissions: Set<String>) = Unit
    override suspend fun updateSalonState(salonState: SalonState?) {
        this.salonState = salonState
    }
    override suspend fun setPushEnabled(enabled: Boolean) = Unit
    override suspend fun setOverlayPermissionPrompted(prompted: Boolean) = Unit
    override suspend fun signOut() = Unit
    override suspend fun clearAll() = Unit
}
