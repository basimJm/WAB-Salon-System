package com.fab.wab.merchant.feature.more.data

import com.fab.wab.merchant.core.data.BaseResponse
import com.fab.wab.merchant.core.data.mock.localizeFixture
import com.fab.wab.merchant.core.domain.session.MemberRole
import com.fab.wab.merchant.feature.more.domain.PhotoChange
import kotlinx.serialization.json.Json
import kotlinx.serialization.json.JsonNull
import kotlinx.serialization.json.JsonPrimitive
import kotlin.test.Test
import kotlin.test.assertEquals
import kotlin.test.assertFalse
import kotlin.test.assertNull
import kotlin.test.assertTrue

class AccountMapperTest {

    private val json = Json { ignoreUnknownKeys = true }

    @Test
    fun mockAccountMapsTheOwner() {
        val account = json.decodeFromString<BaseResponse<MyAccountDto>>(localizeFixture(mockMeFixture.json, "en")).data.toDomain()
        assertEquals(MemberRole.OWNER, account.role)
        assertEquals("+962791234567", account.phone)
        assertNull(account.photoUrl)
        assertNull(account.branchId)
        assertTrue(account.pushEnabled)
    }

    @Test
    fun updateBodySendsThePhotoOnlyWhenItChanges() {
        val keep = updateBody(" Layla ", "Haddad", PhotoChange.Keep)
        assertEquals(JsonPrimitive("Layla"), keep[AccountKeys.FIRST_NAME])
        assertFalse(AccountKeys.PHOTO_KEY in keep)
        assertEquals(JsonNull, updateBody("a", "b", PhotoChange.Remove)[AccountKeys.PHOTO_KEY])
        assertEquals(JsonPrimitive("members/k1.jpg"), updateBody("a", "b", PhotoChange.Set("members/k1.jpg"))[AccountKeys.PHOTO_KEY])
    }
}
