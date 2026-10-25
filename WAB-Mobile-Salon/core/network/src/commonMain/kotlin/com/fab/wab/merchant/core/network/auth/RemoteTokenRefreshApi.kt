package com.fab.wab.merchant.core.network.auth

import com.fab.wab.merchant.core.domain.auth.AuthTokens
import com.fab.wab.merchant.core.domain.auth.TokenRefreshApi
import com.fab.wab.merchant.core.domain.auth.TokenRefreshResult
import com.fab.wab.merchant.core.domain.session.MemberProfile
import com.fab.wab.merchant.core.domain.session.MemberRole
import io.ktor.client.HttpClient
import io.ktor.client.call.body
import io.ktor.client.plugins.HttpRequestTimeoutException
import io.ktor.client.request.post
import io.ktor.client.request.setBody
import io.ktor.http.HttpStatusCode
import io.ktor.http.isSuccess
import kotlinx.coroutines.CancellationException
import kotlinx.io.IOException
import kotlinx.serialization.SerialName
import kotlinx.serialization.Serializable
import kotlinx.serialization.SerializationException

@Serializable
internal data class RefreshRequestDto(
    @SerialName("refreshToken") val refreshToken: String,
)

@Serializable
internal data class RefreshMemberDto(
    @SerialName("id") val id: String? = null,
    @SerialName("salonId") val salonId: String? = null,
    @SerialName("firstName") val firstName: String? = null,
    @SerialName("role") val role: String? = null,
    @SerialName("permissions") val permissions: List<String>? = null,
)

@Serializable
internal data class RefreshTokensDto(
    @SerialName("accessToken") val accessToken: String,
    @SerialName("refreshToken") val refreshToken: String,
    @SerialName("member") val member: RefreshMemberDto? = null,
)

/** The member of a merchant refresh, when it is complete enough to identify the session. */
internal fun RefreshMemberDto.toProfile(): MemberProfile? {
    val role = MemberRole.fromCode(role) ?: return null
    return MemberProfile(id = id ?: return null, salonId = salonId ?: return null, firstName = firstName.orEmpty(), role = role)
}

/** Base success envelope of the backend (`WAB-Server/CLAUDE.md` §6): `{ success, message, data }`. */
@Serializable
internal data class RefreshResponseDto(
    @SerialName("data") val data: RefreshTokensDto? = null,
)

/**
 * Talks to the refresh endpoint with a client that has no token interceptor, so a failing refresh can never
 * trigger another refresh. 400/401/403/422 mean the refresh token is no longer valid; everything else
 * (timeouts, 5xx, 429, parse problems) leaves the session untouched.
 */
internal class RemoteTokenRefreshApi(
    private val client: HttpClient,
) : TokenRefreshApi {

    override suspend fun refresh(refreshToken: String): TokenRefreshResult = try {
        val response = client.post(AuthEndpoints.REFRESH) { setBody(RefreshRequestDto(refreshToken)) }
        when {
            response.status.isSuccess() -> response.body<RefreshResponseDto>().data
                ?.takeIf { it.accessToken.isNotBlank() && it.refreshToken.isNotBlank() }
                ?.let {
                    TokenRefreshResult.Refreshed(
                        tokens = AuthTokens(it.accessToken, it.refreshToken),
                        member = it.member?.toProfile(),
                        permissions = it.member?.permissions?.toSet(),
                    )
                }
                ?: TokenRefreshResult.Unavailable

            response.status in REJECTING_STATUSES -> TokenRefreshResult.Rejected
            else -> TokenRefreshResult.Unavailable
        }
    } catch (e: CancellationException) {
        throw e
    } catch (ignored: SerializationException) {
        TokenRefreshResult.Unavailable
    } catch (ignored: HttpRequestTimeoutException) {
        TokenRefreshResult.Unavailable
    } catch (ignored: IOException) {
        TokenRefreshResult.Unavailable
    }

    private companion object {
        val REJECTING_STATUSES = setOf(
            HttpStatusCode.BadRequest,
            HttpStatusCode.Unauthorized,
            HttpStatusCode.Forbidden,
            HttpStatusCode.UnprocessableEntity,
        )
    }
}
