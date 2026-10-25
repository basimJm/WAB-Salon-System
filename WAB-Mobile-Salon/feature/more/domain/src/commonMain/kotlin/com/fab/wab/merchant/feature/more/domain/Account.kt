package com.fab.wab.merchant.feature.more.domain

import com.fab.wab.merchant.core.domain.AppResult
import com.fab.wab.merchant.core.domain.session.MemberRole

/** `GET /me` (M25 My account): the signed-in member, the photo URL and the push switch. */
data class MyAccount(
    val id: String,
    val firstName: String,
    val lastName: String,
    /** E.164. */
    val phone: String,
    val role: MemberRole?,
    val photoUrl: String?,
    val pushEnabled: Boolean,
    val branchId: String?,
)

/** What a save does with the photo: keep it, remove it (`photoKey: null`) or set a confirmed MEMBER_PHOTO upload. */
sealed interface PhotoChange {
    data object Keep : PhotoChange
    data object Remove : PhotoChange
    data class Set(val key: String) : PhotoChange
}

/** Contract limits of the account calls. */
object AccountLimits {
    const val NAME_MAX = 50
    const val DELETION_NOTE_MAX = 500
}

enum class AccountField { FIRST_NAME, LAST_NAME }

/** Names are required (1..50 after trimming). */
fun accountErrors(firstName: String, lastName: String): Set<AccountField> = buildSet {
    if (firstName.trim().length !in 1..AccountLimits.NAME_MAX) add(AccountField.FIRST_NAME)
    if (lastName.trim().length !in 1..AccountLimits.NAME_MAX) add(AccountField.LAST_NAME)
}

/** M25 account calls: profile, change phone (CHANGE_PHONE OTP proof), push switch, leave, salon deletion request. */
interface AccountRepository {
    suspend fun me(): AppResult<MyAccount>

    suspend fun update(firstName: String, lastName: String, photo: PhotoChange): AppResult<MyAccount>

    /** `409 PHONE_ALREADY_REGISTERED` when another member has the number. */
    suspend fun changePhone(countryCode: String, number: String, idToken: String): AppResult<MyAccount>

    suspend fun setPushEnabled(enabled: Boolean): AppResult<Unit>

    /** Non-owner self-removal; the owner gets `422 LAST_OWNER`. */
    suspend fun leave(): AppResult<Unit>

    /** Owner only; returns `requestedAt` (asking again while open returns the same date). */
    suspend fun requestSalonDeletion(note: String?): AppResult<String>
}
