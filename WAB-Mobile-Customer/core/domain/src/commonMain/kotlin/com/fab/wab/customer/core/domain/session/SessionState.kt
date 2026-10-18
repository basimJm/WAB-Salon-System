package com.fab.wab.customer.core.domain.session

/** Guest identity (PRD §5 `guest_nickname`, `guest_gender`): local only, never sent to the server (PRD §15). */
data class GuestProfile(
    val nickname: String? = null,
    val gender: Gender? = null,
) {
    val isEmpty: Boolean get() = nickname == null && gender == null

    /** S02 done: both values saved (PRD §4.1 "Guest (complete)"). */
    val isComplete: Boolean get() = !nickname.isNullOrBlank() && gender != null
}

/** Registered customer facts kept locally (PRD §5 `user_first_name`, `user_gender`; the id keys analytics and crash reports, PRD §14). */
data class UserProfile(
    val id: String,
    val firstName: String,
    val gender: Gender?,
)

/** Who is using the app right now; derived from the session store, never built by features. */
sealed interface SessionState {
    val genderScope: Gender?
    val isSignedIn: Boolean

    data class Guest(val profile: GuestProfile = GuestProfile()) : SessionState {
        override val genderScope: Gender? get() = profile.gender
        override val isSignedIn: Boolean get() = false
    }

    data class SignedIn(val user: UserProfile) : SessionState {
        override val genderScope: Gender? get() = user.gender
        override val isSignedIn: Boolean get() = true
    }
}
