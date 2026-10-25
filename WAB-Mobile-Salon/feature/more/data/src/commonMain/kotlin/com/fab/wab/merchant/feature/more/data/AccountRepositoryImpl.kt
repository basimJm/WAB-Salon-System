package com.fab.wab.merchant.feature.more.data

import com.fab.wab.merchant.core.data.BaseResponse
import com.fab.wab.merchant.core.data.contract.generated.MerchantOperations
import com.fab.wab.merchant.core.data.contract.generated.PatchInstallationsPushEnabledBody
import com.fab.wab.merchant.core.data.contract.generated.PostAuthChangePhoneBody
import com.fab.wab.merchant.core.data.contract.generated.PostAuthChangePhoneBodyPhone
import com.fab.wab.merchant.core.data.contract.generated.PostSalonDeletionRequestBody
import com.fab.wab.merchant.core.data.contract.generated.PostSalonDeletionRequestData
import com.fab.wab.merchant.core.domain.AppResult
import com.fab.wab.merchant.core.domain.mapSuccess
import com.fab.wab.merchant.core.domain.session.MemberRole
import com.fab.wab.merchant.core.network.safeApiCall
import com.fab.wab.merchant.feature.more.domain.AccountRepository
import com.fab.wab.merchant.feature.more.domain.MyAccount
import com.fab.wab.merchant.feature.more.domain.PhotoChange
import io.ktor.client.HttpClient
import io.ktor.client.call.body
import io.ktor.client.request.get
import io.ktor.client.request.patch
import io.ktor.client.request.post
import io.ktor.client.request.setBody
import kotlinx.serialization.Serializable
import kotlinx.serialization.json.JsonElement
import kotlinx.serialization.json.JsonNull
import kotlinx.serialization.json.JsonObject
import kotlinx.serialization.json.JsonPrimitive

/**
 * `data` of `GET/PATCH /me` and `POST /auth/change-phone`: the contract's `MemberProfile` + `photoUrl` + `pushEnabled`
 * (an `allOf` the generator types as `JsonElement`, so it is declared here).
 */
@Serializable
data class MyAccountDto(
    val id: String,
    val firstName: String,
    val lastName: String,
    val phone: String,
    val role: String,
    val photoUrl: String? = null,
    val pushEnabled: Boolean = true,
    val branchId: String? = null,
)

internal object AccountKeys {
    const val FIRST_NAME = "firstName"
    const val LAST_NAME = "lastName"
    const val PHOTO_KEY = "photoKey"
}

class AccountApi(private val client: HttpClient) {
    suspend fun me(): BaseResponse<MyAccountDto> = client.get(MerchantOperations.getMe.path).body()

    suspend fun update(body: JsonObject): BaseResponse<MyAccountDto> = client.patch(MerchantOperations.patchMe.path) { setBody(body) }.body()

    suspend fun changePhone(body: PostAuthChangePhoneBody): BaseResponse<MyAccountDto> =
        client.post(MerchantOperations.postAuthChangePhone.path) { setBody(body) }.body()

    suspend fun setPushEnabled(enabled: Boolean): BaseResponse<JsonElement?> =
        client.patch(MerchantOperations.patchInstallationsPushEnabled.path) { setBody(PatchInstallationsPushEnabledBody(enabled)) }.body()

    suspend fun leave(): BaseResponse<JsonElement?> = client.post(MerchantOperations.postMeLeave.path).body()

    suspend fun requestSalonDeletion(note: String?): BaseResponse<PostSalonDeletionRequestData> =
        client.post(MerchantOperations.postSalonDeletionRequest.path) { setBody(PostSalonDeletionRequestBody(note)) }.body()
}

fun MyAccountDto.toDomain() = MyAccount(
    id = id,
    firstName = firstName,
    lastName = lastName,
    phone = phone,
    role = MemberRole.fromCode(role),
    photoUrl = photoUrl?.takeIf { it.isNotBlank() },
    pushEnabled = pushEnabled,
    branchId = branchId,
)

/** Names trimmed; the photo key only when it changes, `null` to remove it (the client drops nulls, so JSON by hand). */
fun updateBody(firstName: String, lastName: String, photo: PhotoChange): JsonObject = JsonObject(
    buildMap {
        put(AccountKeys.FIRST_NAME, JsonPrimitive(firstName.trim()))
        put(AccountKeys.LAST_NAME, JsonPrimitive(lastName.trim()))
        when (photo) {
            PhotoChange.Keep -> Unit
            PhotoChange.Remove -> put(AccountKeys.PHOTO_KEY, JsonNull)
            is PhotoChange.Set -> put(AccountKeys.PHOTO_KEY, JsonPrimitive(photo.key))
        }
    },
)

class AccountRepositoryImpl(private val api: AccountApi) : AccountRepository {
    override suspend fun me(): AppResult<MyAccount> = safeApiCall { api.me() }.mapSuccess { it.data.toDomain() }

    override suspend fun update(firstName: String, lastName: String, photo: PhotoChange): AppResult<MyAccount> =
        safeApiCall { api.update(updateBody(firstName, lastName, photo)) }.mapSuccess { it.data.toDomain() }

    override suspend fun changePhone(countryCode: String, number: String, idToken: String): AppResult<MyAccount> =
        safeApiCall { api.changePhone(PostAuthChangePhoneBody(PostAuthChangePhoneBodyPhone(countryCode, number), idToken)) }
            .mapSuccess { it.data.toDomain() }

    override suspend fun setPushEnabled(enabled: Boolean): AppResult<Unit> = safeApiCall { api.setPushEnabled(enabled) }.mapSuccess { }

    override suspend fun leave(): AppResult<Unit> = safeApiCall { api.leave() }.mapSuccess { }

    override suspend fun requestSalonDeletion(note: String?): AppResult<String> =
        safeApiCall { api.requestSalonDeletion(note?.trim()?.takeIf { it.isNotEmpty() }) }.mapSuccess { it.data.requestedAt }
}
