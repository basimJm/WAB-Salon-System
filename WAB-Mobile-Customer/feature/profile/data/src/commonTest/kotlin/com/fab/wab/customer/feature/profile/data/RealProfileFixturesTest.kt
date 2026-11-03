package com.fab.wab.customer.feature.profile.data

import com.fab.wab.customer.core.data.contract.generated.DeleteProfileAvatarData
import com.fab.wab.customer.core.data.contract.generated.GetProfileData
import com.fab.wab.customer.core.data.contract.generated.PatchProfileData
import com.fab.wab.customer.core.data.contract.generated.PostUploadsPresignData
import com.fab.wab.customer.core.data.mock.decodeFixture
import com.fab.wab.customer.core.data.upload.toDomain
import com.fab.wab.customer.feature.profile.data.repository.toDomain
import kotlin.test.Test
import kotlin.test.assertEquals
import kotlin.test.assertNotNull
import kotlin.test.assertNull
import kotlin.test.assertTrue

/** CUS-060: profile, edit, avatar removal and upload pre-sign captured from the local real stack. */
class RealProfileFixturesTest {

    @Test
    fun realProfileMapsPhoneGenderAndLocation() {
        val account = decodeFixture("GetProfile", GetProfileData.serializer()).data.toDomain()
        assertNotNull(account.gender)
        assertTrue(account.phoneE164.startsWith("+") && account.phoneE164.endsWith(account.phoneNumber))
        assertTrue(account.cityId.isNotBlank() && account.areaId.isNotBlank())
        assertEquals(account.id, decodeFixture("PatchProfile", PatchProfileData.serializer()).data.toDomain().id)
        assertNull(decodeFixture("DeleteProfileAvatar", DeleteProfileAvatarData.serializer()).data.toDomain().avatarUrl)
    }

    @Test
    fun realPresignAnswerMapsTheUploadTarget() {
        val upload = decodeFixture("PostUploadsPresign", PostUploadsPresignData.serializer()).data.toDomain()
        assertTrue(upload.key.isNotBlank())
        assertTrue(upload.headers.isNotEmpty(), "the signed Content-Type header must be sent with the PUT")
    }
}
