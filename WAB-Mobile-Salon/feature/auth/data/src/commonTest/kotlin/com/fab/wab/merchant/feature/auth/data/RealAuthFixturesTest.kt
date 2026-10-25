package com.fab.wab.merchant.feature.auth.data

import com.fab.wab.merchant.core.data.contract.generated.PostAuthLoginData
import com.fab.wab.merchant.core.data.contract.generated.PostAuthOtpRequestData
import com.fab.wab.merchant.core.data.contract.generated.PostAuthOtpWrongAttemptData
import com.fab.wab.merchant.core.data.mock.decodeFixture
import com.fab.wab.merchant.feature.auth.data.repository.toDomain
import kotlinx.serialization.serializer
import kotlin.test.Test
import kotlin.test.assertEquals
import kotlin.test.assertNotNull
import kotlin.test.assertTrue

/** MER-054: the auth mappers on responses captured from the local real stack (core/data/fixtures/remote). */
class RealAuthFixturesTest {

    @Test
    fun loginOtpAndWrongAttemptMap() {
        val login = decodeFixture("PostAuthLogin", serializer<PostAuthLoginData>()).data
        assertNotNull(login.toDomain())
        assertEquals("OWNER", login.member.role)
        assertEquals(null, login.member.branchId)
        assertNotNull(decodeFixture("PostAuthOtpRequest", serializer<PostAuthOtpRequestData>()).data.toDomain())
        assertNotNull(decodeFixture("PostAuthOtpWrongAttempt", serializer<PostAuthOtpWrongAttemptData>()).data.toDomain())
    }
}
