package com.fab.wab.merchant.core.network.client

import io.ktor.client.request.HttpRequestBuilder
import io.ktor.util.AttributeKey

/** Marks a request that needs no session: it goes out without the access token and is never refreshed on 401. */
private val PublicRequestKey = AttributeKey<Unit>("PublicRequest")

/**
 * A public endpoint whose 401 is a business answer, not an expired session (`POST /auth/otp/verify` answers
 * `OTP_INVALID` / `OTP_EXPIRED` with 401): refreshing and repeating it would count a wrong code twice (MER-070).
 */
fun HttpRequestBuilder.publicRequest() {
    attributes.put(PublicRequestKey, Unit)
}

internal val HttpRequestBuilder.isPublicRequest: Boolean get() = attributes.contains(PublicRequestKey)
