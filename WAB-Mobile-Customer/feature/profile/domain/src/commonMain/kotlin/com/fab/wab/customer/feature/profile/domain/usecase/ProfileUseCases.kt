package com.fab.wab.customer.feature.profile.domain.usecase

import com.fab.wab.customer.core.domain.AppError
import com.fab.wab.customer.core.domain.AppResult
import com.fab.wab.customer.core.domain.ErrorCode
import com.fab.wab.customer.core.domain.session.Gender
import com.fab.wab.customer.core.domain.session.GuestProfile
import com.fab.wab.customer.core.domain.session.SessionStore
import com.fab.wab.customer.core.domain.session.UserProfile
import com.fab.wab.customer.feature.profile.domain.model.ProfileUpdate
import com.fab.wab.customer.feature.profile.domain.model.CustomerAccount
import com.fab.wab.customer.feature.profile.domain.model.ProfileDefaults
import com.fab.wab.customer.feature.profile.domain.model.UploadPurpose
import com.fab.wab.customer.feature.profile.domain.repository.ProfileRepository
import com.fab.wab.customer.feature.profile.domain.repository.UploadsRepository

class LoadProfileUseCase(private val repository: ProfileRepository) {
    suspend operator fun invoke(): AppResult<CustomerAccount> = repository.me()
}

/** PRD §3.16: presign → direct upload → confirm → `PUT /profile/avatar`; any failed step surfaces as the error. */
class UploadAvatarUseCase(private val uploads: UploadsRepository, private val profile: ProfileRepository) {
    suspend operator fun invoke(bytes: ByteArray, contentType: String): AppResult<CustomerAccount> =
        uploads.presign(UploadPurpose.CUSTOMER_AVATAR, contentType, bytes.size).andThen { presigned ->
            if (bytes.size > presigned.maxBytes) {
                AppResult.Error(tooLarge(presigned.maxBytes))
            } else {
                uploads.upload(presigned, bytes, contentType)
                    .andThen { uploads.confirm(presigned.key) }
                    .andThen { profile.setAvatar(presigned.key) }
            }
        }
}

/** Runs [next] on success; errors and the loading marker pass through unchanged. */
private suspend inline fun <T, R> AppResult<T>.andThen(next: (T) -> AppResult<R>): AppResult<R> = when (this) {
    is AppResult.Success -> next(data)
    is AppResult.Error -> this
    AppResult.Loading -> AppResult.Loading
}

/** Mirrors the server's `UPLOAD_TOO_LARGE` so the UI shows the same localized text without a round trip. */
private fun tooLarge(maxBytes: Long): AppError =
    AppError.ServerError(code = ErrorCode.UPLOAD_TOO_LARGE, statusCode = HTTP_PAYLOAD_TOO_LARGE, message = maxBytes.toString())

private const val HTTP_PAYLOAD_TOO_LARGE = 413

class DeleteAvatarUseCase(private val repository: ProfileRepository) {
    suspend operator fun invoke(): AppResult<CustomerAccount> = repository.deleteAvatar()
}

/** PRD S21: `DELETE /profile` schedules deletion after the grace period; the device continues as Guest. */
class DeleteAccountUseCase(private val repository: ProfileRepository, private val sessionStore: SessionStore) {
    suspend operator fun invoke(): AppResult<String> {
        val result = repository.deleteAccount()
        if (result is AppResult.Success) sessionStore.signOut()
        return result
    }
}

/** Guest header edit (PRD S21 item 1): local only, never sent to the server. */
class UpdateGuestProfileUseCase(private val sessionStore: SessionStore) {
    suspend operator fun invoke(nickname: String, gender: Gender) =
        sessionStore.setGuestProfile(GuestProfile(nickname.trim().take(ProfileDefaults.MAX_NICKNAME_LENGTH), gender))
}

/** PRD S22: saves the form and refreshes the locally stored first name / gender. */
class UpdateProfileUseCase(private val repository: ProfileRepository, private val sessionStore: SessionStore) {
    suspend operator fun invoke(update: ProfileUpdate): AppResult<CustomerAccount> {
        val result = repository.update(update)
        if (result is AppResult.Success) {
            val account = result.data
            sessionStore.updateUser(UserProfile(id = account.id, firstName = account.firstName, gender = account.gender))
        }
        return result
    }
}
