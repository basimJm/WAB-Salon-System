package com.fab.wab.customer.feature.onboarding.domain.usecase

import com.fab.wab.customer.core.domain.session.Gender
import com.fab.wab.customer.core.domain.session.GuestProfile
import com.fab.wab.customer.core.domain.session.SessionStore

/** S02: both values are required; they stay on the device (PRD §15). */
class SaveGuestProfileUseCase(private val sessionStore: SessionStore) {
    suspend operator fun invoke(nickname: String, gender: Gender) =
        sessionStore.setGuestProfile(GuestProfile(nickname = nickname.trim(), gender = gender))
}
