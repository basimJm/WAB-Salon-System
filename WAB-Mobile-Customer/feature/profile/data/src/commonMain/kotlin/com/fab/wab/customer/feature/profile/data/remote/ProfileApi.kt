package com.fab.wab.customer.feature.profile.data.remote

import com.fab.wab.customer.core.data.BaseResponse
import com.fab.wab.customer.core.data.contract.generated.CustomerOperations
import com.fab.wab.customer.core.data.contract.generated.DeleteProfileAvatarData
import com.fab.wab.customer.core.data.contract.generated.DeleteProfileData
import com.fab.wab.customer.core.data.contract.generated.GetProfileData
import com.fab.wab.customer.core.data.contract.generated.PatchProfileBody
import com.fab.wab.customer.core.data.contract.generated.PatchProfileData
import com.fab.wab.customer.core.data.contract.generated.PutProfileAvatarBody
import com.fab.wab.customer.core.data.contract.generated.PutProfileAvatarData
import io.ktor.client.HttpClient
import io.ktor.client.call.body
import io.ktor.client.request.delete
import io.ktor.client.request.get
import io.ktor.client.request.patch
import io.ktor.client.request.put
import io.ktor.client.request.setBody

class ProfileApi(private val client: HttpClient) {
    suspend fun me(): BaseResponse<GetProfileData> = client.get(CustomerOperations.getProfile.path).body()

    suspend fun update(body: PatchProfileBody): BaseResponse<PatchProfileData> =
        client.patch(CustomerOperations.patchProfile.path) { setBody(body) }.body()

    suspend fun putAvatar(key: String): BaseResponse<PutProfileAvatarData> =
        client.put(CustomerOperations.putProfileAvatar.path) { setBody(PutProfileAvatarBody(key)) }.body()

    suspend fun deleteAvatar(): BaseResponse<DeleteProfileAvatarData> = client.delete(CustomerOperations.deleteProfileAvatar.path).body()

    suspend fun deleteProfile(): BaseResponse<DeleteProfileData> = client.delete(CustomerOperations.deleteProfile.path).body()
}
