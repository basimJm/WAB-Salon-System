package com.fab.wab.customer.feature.onboarding.domain.usecase

import com.fab.wab.customer.core.domain.session.SessionStore
import kotlinx.coroutines.flow.Flow

/** PRD S01: `onboarding_seen` is written as soon as the onboarding is displayed, never on completion. */
class MarkOnboardingSeenUseCase(private val sessionStore: SessionStore) {
    suspend operator fun invoke() = sessionStore.setOnboardingSeen(true)
}

class ObserveOnboardingSeenUseCase(private val sessionStore: SessionStore) {
    operator fun invoke(): Flow<Boolean> = sessionStore.onboardingSeen
}
