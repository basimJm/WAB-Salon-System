package com.fab.wab.merchant.feature.salon.data

import com.fab.wab.merchant.core.data.BaseResponse
import com.fab.wab.merchant.core.data.contract.generated.GetSubscriptionData
import com.fab.wab.merchant.core.data.contract.generated.MerchantOperations
import com.fab.wab.merchant.core.domain.AppResult
import com.fab.wab.merchant.core.domain.mapSuccess
import com.fab.wab.merchant.core.domain.session.SalonState
import com.fab.wab.merchant.core.network.safeApiCall
import com.fab.wab.merchant.feature.salon.domain.Subscription
import com.fab.wab.merchant.feature.salon.domain.SubscriptionRepository
import com.fab.wab.merchant.feature.salon.domain.SubscriptionStatus
import io.ktor.client.HttpClient
import io.ktor.client.call.body
import io.ktor.client.request.get

class SubscriptionApi(private val client: HttpClient) {
    suspend fun subscription(): BaseResponse<GetSubscriptionData> = client.get(MerchantOperations.getSubscription.path).body()
}

/** The end date that matters for the status: trial end, current period end, or when it expired. */
fun GetSubscriptionData.toDomain(): Subscription {
    val state = SubscriptionStatus.entries.firstOrNull { it.name == status.uppercase() } ?: SubscriptionStatus.EXPIRED
    val end = when (state) {
        SubscriptionStatus.TRIAL -> trialEndsAt ?: endsAt
        SubscriptionStatus.ACTIVE -> currentPeriodEnd ?: endsAt
        SubscriptionStatus.EXPIRED -> endsAt ?: currentPeriodEnd ?: trialEndsAt
    }
    return Subscription(state, SalonState.fromCode(salonState), end, daysRemaining.toInt(), endingSoon)
}

class SubscriptionRepositoryImpl(private val api: SubscriptionApi) : SubscriptionRepository {
    override suspend fun subscription(): AppResult<Subscription> = safeApiCall { api.subscription() }.mapSuccess { it.data.toDomain() }
}
