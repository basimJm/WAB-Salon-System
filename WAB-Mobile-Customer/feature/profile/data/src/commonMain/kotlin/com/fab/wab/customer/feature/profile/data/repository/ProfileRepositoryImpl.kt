package com.fab.wab.customer.feature.profile.data.repository

import com.fab.wab.customer.core.data.contract.generated.GetProfileData
import com.fab.wab.customer.core.data.contract.generated.PatchProfileBody
import com.fab.wab.customer.core.data.contract.generated.PatchProfileData
import com.fab.wab.customer.core.data.contract.generated.PostUploadsPresignBody
import com.fab.wab.customer.core.data.contract.generated.PostUploadsPresignData
import com.fab.wab.customer.core.data.contract.generated.PutProfileAvatarData
import com.fab.wab.customer.core.data.contract.generated.DeleteProfileAvatarData
import com.fab.wab.customer.core.domain.AppError
import com.fab.wab.customer.core.domain.AppResult
import com.fab.wab.customer.core.domain.mapSuccess
import com.fab.wab.customer.core.domain.session.Gender
import com.fab.wab.customer.core.network.safeApiCall
import com.fab.wab.customer.feature.profile.data.remote.ProfileApi
import com.fab.wab.customer.feature.profile.data.remote.UploadsApi
import com.fab.wab.customer.feature.profile.domain.model.CustomerAccount
import com.fab.wab.customer.feature.profile.domain.model.PresignedUpload
import com.fab.wab.customer.feature.profile.domain.model.ProfileUpdate
import com.fab.wab.customer.feature.profile.domain.repository.ProfileRepository
import com.fab.wab.customer.feature.profile.domain.repository.UploadsRepository
import kotlinx.serialization.json.JsonPrimitive

class ProfileRepositoryImpl(private val api: ProfileApi) : ProfileRepository {
    override suspend fun me(): AppResult<CustomerAccount> = safeApiCall { api.me() }.mapSuccess { it.data.toDomain() }
    override suspend fun update(update: ProfileUpdate): AppResult<CustomerAccount> = safeApiCall {
        api.update(
            PatchProfileBody(
                firstName = update.firstName, lastName = update.lastName, email = update.email, gender = update.gender.code,
                cityId = update.cityId, areaId = update.areaId,
            ),
        )
    }.mapSuccess { it.data.toDomain() }

    override suspend fun setAvatar(key: String): AppResult<CustomerAccount> = safeApiCall { api.putAvatar(key) }.mapSuccess { it.data.toDomain() }
    override suspend fun deleteAvatar(): AppResult<CustomerAccount> = safeApiCall { api.deleteAvatar() }.mapSuccess { it.data.toDomain() }
    override suspend fun deleteAccount(): AppResult<String> = safeApiCall { api.deleteProfile() }.mapSuccess { it.data.deletionScheduledAt }
}

class UploadsRepositoryImpl(private val api: UploadsApi) : UploadsRepository {
    override suspend fun presign(purpose: String, contentType: String, size: Int): AppResult<PresignedUpload> =
        safeApiCall { api.presign(PostUploadsPresignBody(purpose, contentType, size)) }.mapSuccess { it.data.toDomain() }

    override suspend fun upload(target: PresignedUpload, bytes: ByteArray, contentType: String): AppResult<Unit> {
        val ok = runCatching { api.upload(target, bytes, contentType) }.getOrElse { e -> return AppResult.Error(AppError.NetworkError(e.message.orEmpty())) }
        return if (ok) AppResult.Success(Unit) else AppResult.Error(AppError.HttpError(STORAGE_REJECTED, null))
    }

    override suspend fun confirm(key: String): AppResult<String?> = safeApiCall { api.confirm(key) }.mapSuccess { it.data.url }

    private companion object {
        /** The storage answered outside 2xx (expired or wrong signature); shown as a generic upload failure. */
        const val STORAGE_REJECTED = 400
    }
}

fun GetProfileData.toDomain() = CustomerAccount(
    id, firstName, lastName, email, Gender.fromCode(gender), phone.e164, phone.countryCode, phone.number, cityId, areaId, avatarUrl, pushEnabled,
)
fun PatchProfileData.toDomain() = CustomerAccount(
    id, firstName, lastName, email, Gender.fromCode(gender), phone.e164, phone.countryCode, phone.number, cityId, areaId, avatarUrl, pushEnabled,
)
fun PutProfileAvatarData.toDomain() = CustomerAccount(
    id, firstName, lastName, email, Gender.fromCode(gender), phone.e164, phone.countryCode, phone.number, cityId, areaId, avatarUrl, pushEnabled,
)
fun DeleteProfileAvatarData.toDomain() = CustomerAccount(
    id, firstName, lastName, email, Gender.fromCode(gender), phone.e164, phone.countryCode, phone.number, cityId, areaId, avatarUrl, pushEnabled,
)

fun PostUploadsPresignData.toDomain() = PresignedUpload(
    key = key,
    url = upload.url,
    method = upload.method,
    headers = upload.headers.mapNotNull { (name, value) -> (value as? JsonPrimitive)?.content?.let { name to it } }.toMap(),
    maxBytes = maxBytes.toLong(),
)
