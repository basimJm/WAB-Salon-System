package com.fab.wab.merchant.feature.more.presentation

import com.fab.wab.merchant.core.domain.AppError
import com.fab.wab.merchant.core.domain.AppResult
import com.fab.wab.merchant.core.domain.session.MemberRole
import com.fab.wab.merchant.feature.more.domain.AccountRepository
import com.fab.wab.merchant.feature.more.domain.MyAccount
import com.fab.wab.merchant.feature.more.domain.PhotoChange

internal val ACCOUNT = MyAccount("m", "Huda", "Saleh", "+962791234567", MemberRole.OWNER, "https://cdn/p.jpg", true, null)

/** Records every account call; [fail] turns the writes into network errors. */
internal class FakeAccount(var account: MyAccount = ACCOUNT) : AccountRepository {
    val calls = mutableListOf<String>()
    var fail = false
    private val error = AppResult.Error(AppError.NetworkError("x"))

    override suspend fun me(): AppResult<MyAccount> = AppResult.Success(account)

    override suspend fun update(firstName: String, lastName: String, photo: PhotoChange): AppResult<MyAccount> {
        calls += "update:$firstName:$lastName:$photo"
        if (fail) return error
        val photoUrl = if (photo == PhotoChange.Remove) null else account.photoUrl
        account = account.copy(firstName = firstName.trim(), lastName = lastName.trim(), photoUrl = photoUrl)
        return AppResult.Success(account)
    }

    override suspend fun changePhone(countryCode: String, number: String, otpToken: String): AppResult<MyAccount> {
        calls += "phone:$countryCode:$number:$otpToken"
        if (fail) return error
        account = account.copy(phone = "+962$number")
        return AppResult.Success(account)
    }

    override suspend fun setPushEnabled(enabled: Boolean): AppResult<Unit> {
        calls += "push:$enabled"
        return if (fail) error else AppResult.Success(Unit)
    }

    override suspend fun leave(): AppResult<Unit> {
        calls += "leave"
        return if (fail) error else AppResult.Success(Unit)
    }

    override suspend fun requestSalonDeletion(note: String?): AppResult<String> {
        calls += "deletion:$note"
        return if (fail) error else AppResult.Success("2026-10-25T09:00:00Z")
    }
}
