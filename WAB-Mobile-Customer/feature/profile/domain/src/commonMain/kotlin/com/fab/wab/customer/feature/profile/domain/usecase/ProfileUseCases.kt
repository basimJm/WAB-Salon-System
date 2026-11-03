package com.fab.wab.customer.feature.profile.domain.usecase

import com.fab.wab.customer.core.domain.AppResult
import com.fab.wab.customer.core.domain.session.Gender
import com.fab.wab.customer.core.domain.session.GuestProfile
import com.fab.wab.customer.core.domain.session.SessionStore
import com.fab.wab.customer.core.domain.session.UserProfile
import com.fab.wab.customer.feature.profile.domain.model.ProfileUpdate
import com.fab.wab.customer.feature.profile.domain.model.CustomerAccount
import com.fab.wab.customer.feature.profile.domain.model.ProfileDefaults
import com.fab.wab.customer.core.domain.upload.UploadPurpose
import com.fab.wab.customer.core.domain.upload.UploadsRepository
import com.fab.wab.customer.core.domain.upload.andThen
import com.fab.wab.customer.core.domain.upload.uploadConfirmed
import com.fab.wab.customer.feature.profile.domain.repository.ProfileRepository

class LoadProfileUseCase(private val repository: ProfileRepository) {
    suspend operator fun invoke(): AppResult<CustomerAccount> = repository.me()
}

/** PRD §3.16: presign → direct upload → confirm → `PUT /profile/avatar`; any failed step surfaces as the error. */
class UploadAvatarUseCase(private val uploads: UploadsRepository, private val profile: ProfileRepository) {
    suspend operator fun invoke(bytes: ByteArray, contentType: String): AppResult<CustomerAccount> =
        uploads.uploadConfirmed(UploadPurpose.CUSTOMER_AVATAR, bytes, contentType).andThen { key -> profile.setAvatar(key) }
}

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
