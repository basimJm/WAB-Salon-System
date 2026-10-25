package com.fab.wab.merchant.feature.salon.domain

import com.fab.wab.merchant.core.domain.AppResult
import com.fab.wab.merchant.core.domain.session.SalonState

enum class SubscriptionStatus { TRIAL, ACTIVE, EXPIRED }

/** `GET /subscription` (SUBSCRIPTION_VIEW); dates are ISO text from the server. */
data class Subscription(
    val status: SubscriptionStatus,
    val salonState: SalonState?,
    val endsAt: String?,
    val daysRemaining: Int,
    val endingSoon: Boolean,
)

interface SubscriptionRepository {
    suspend fun subscription(): AppResult<Subscription>
}
