package com.fab.wab.customer.feature.profile.domain

import com.fab.wab.customer.core.domain.AppError
import com.fab.wab.customer.core.domain.AppResult
import com.fab.wab.customer.core.domain.ErrorCode
import com.fab.wab.customer.core.domain.auth.AuthTokens
import com.fab.wab.customer.core.domain.session.Gender
import com.fab.wab.customer.core.domain.session.GuestProfile
import com.fab.wab.customer.core.domain.session.SessionState
import com.fab.wab.customer.core.domain.session.SessionStore
import com.fab.wab.customer.core.domain.session.UserProfile
import com.fab.wab.customer.feature.profile.domain.model.CustomerAccount
import com.fab.wab.customer.core.domain.upload.PresignedUpload
import com.fab.wab.customer.feature.profile.domain.model.ProfileUpdate
import com.fab.wab.customer.feature.profile.domain.repository.ProfileRepository
import com.fab.wab.customer.core.domain.upload.UploadsRepository
import com.fab.wab.customer.feature.profile.domain.usecase.DeleteAccountUseCase
import com.fab.wab.customer.feature.profile.domain.usecase.UpdateGuestProfileUseCase
import com.fab.wab.customer.feature.profile.domain.usecase.UploadAvatarUseCase
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.test.runTest
import kotlin.test.Test
import kotlin.test.assertEquals
import kotlin.test.assertIs
import kotlin.test.assertTrue

internal val ACCOUNT = CustomerAccount(
    "c1",
    "Sara",
    "Ali",
    "s@x.com",
    Gender.FEMALE,
    "+962790000000",
    "JO",
    "790000000",
    "city-1",
    "area-1",
    null,
    true,
)

internal class ProfileFake : ProfileRepository {
    val avatarKeys = mutableListOf<String>()
    val updates = mutableListOf<ProfileUpdate>()
    var deleted = false
    override suspend fun me(): AppResult<CustomerAccount> = AppResult.Success(ACCOUNT)
    override suspend fun setAvatar(key: String): AppResult<CustomerAccount> {
        avatarKeys += key
        return AppResult.Success(ACCOUNT.copy(avatarUrl = "cdn/$key"))
    }
    override suspend fun update(update: ProfileUpdate): AppResult<CustomerAccount> {
        updates += update
        return AppResult.Success(
            ACCOUNT.copy(firstName = update.firstName, lastName = update.lastName, email = update.email, gender = update.gender),
        )
    }
    override suspend fun deleteAvatar(): AppResult<CustomerAccount> = AppResult.Success(ACCOUNT)
    override suspend fun deleteAccount(): AppResult<String> {
        deleted = true
        return AppResult.Success("2026-11-18T10:00:00Z")
    }
}

internal class UploadsFake(var maxBytes: Long = 1_000_000) : UploadsRepository {
    val steps = mutableListOf<String>()
    var uploadResult: AppResult<Unit> = AppResult.Success(Unit)
    override suspend fun presign(purpose: String, contentType: String, size: Int): AppResult<PresignedUpload> {
        steps += "presign:$purpose:$contentType:$size"
        return AppResult.Success(PresignedUpload("k1", "https://storage.example/k1", "PUT", emptyMap(), maxBytes))
    }
    override suspend fun upload(target: PresignedUpload, bytes: ByteArray, contentType: String): AppResult<Unit> {
        steps += "upload:${target.key}"
        return uploadResult
    }
    override suspend fun confirm(key: String): AppResult<String?> {
        steps += "confirm:$key"
        return AppResult.Success(null)
    }
}

internal class SessionFake(initial: SessionState) : SessionStore {
    val sessionState = MutableStateFlow(initial)
    val guestProfiles = mutableListOf<GuestProfile>()
    var signedOut = false
    override val state: Flow<SessionState> = sessionState
    override val onboardingSeen: Flow<Boolean> = MutableStateFlow(true)
    override val pushEnabled: Flow<Boolean> = MutableStateFlow(true)
    override suspend fun tokens(): AuthTokens? = null
    override suspend fun signIn(tokens: AuthTokens, user: UserProfile) = Unit
    override suspend fun updateTokens(tokens: AuthTokens) = Unit
    override suspend fun updateUser(user: UserProfile) = Unit
    override suspend fun setOnboardingSeen(seen: Boolean) = Unit
    override suspend fun setGuestProfile(profile: GuestProfile) { guestProfiles += profile }
    override suspend fun setPushEnabled(enabled: Boolean) = Unit
    override suspend fun signOut() {
        signedOut = true
        sessionState.value = SessionState.Guest()
    }
    override suspend fun clearAll() = Unit
}

class ProfileUseCasesTest {

    @Test
    fun uploadAvatarRunsPresignUploadConfirmThenSetsTheAvatar() = runTest {
        val uploads = UploadsFake()
        val profile = ProfileFake()
        val result = UploadAvatarUseCase(uploads, profile)(ByteArray(10), "image/jpeg")
        assertEquals(listOf("presign:CUSTOMER_AVATAR:image/jpeg:10", "upload:k1", "confirm:k1"), uploads.steps)
        assertEquals(listOf("k1"), profile.avatarKeys)
        assertEquals("cdn/k1", (result as AppResult.Success).data.avatarUrl)
    }

    @Test
    fun uploadStopsOnTooLargeAndOnStorageFailure() = runTest {
        val small = UploadsFake(maxBytes = 5)
        val tooLarge = UploadAvatarUseCase(small, ProfileFake())(ByteArray(10), "image/jpeg")
        assertEquals(ErrorCode.UPLOAD_TOO_LARGE, ((tooLarge as AppResult.Error).appError as AppError.ServerError).code)
        assertEquals(1, small.steps.size, "nothing uploaded")
        val failing = UploadsFake().apply { uploadResult = AppResult.Error(AppError.NetworkError("offline")) }
        val profile = ProfileFake()
        assertIs<AppResult.Error>(UploadAvatarUseCase(failing, profile)(ByteArray(1), "image/jpeg"))
        assertTrue(profile.avatarKeys.isEmpty())
    }

    @Test
    fun deleteAccountSignsOutOnlyOnSuccessAndGuestEditTrims() = runTest {
        val session = SessionFake(SessionState.SignedIn(UserProfile("c1", "Sara", Gender.FEMALE)))
        val profile = ProfileFake()
        DeleteAccountUseCase(profile, session)()
        assertTrue(profile.deleted)
        assertTrue(session.signedOut)
        UpdateGuestProfileUseCase(session)("  Lina ", Gender.FEMALE)
        assertEquals(GuestProfile("Lina", Gender.FEMALE), session.guestProfiles.single())
    }
}
