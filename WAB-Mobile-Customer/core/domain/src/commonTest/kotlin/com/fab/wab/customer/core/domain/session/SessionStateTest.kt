package com.fab.wab.customer.core.domain.session

import kotlin.test.Test
import kotlin.test.assertEquals
import kotlin.test.assertFalse
import kotlin.test.assertNull
import kotlin.test.assertTrue

class SessionStateTest {

    @Test
    fun genderCodesAreParsedLeniently() {
        assertEquals(Gender.FEMALE, Gender.fromCode("female"))
        assertEquals(Gender.MALE, Gender.fromCode(" MALE "))
        assertNull(Gender.fromCode("other"))
        assertNull(Gender.fromCode(null))
    }

    @Test
    fun scopeComesFromTheActiveIdentity() {
        val guest = SessionState.Guest(GuestProfile(nickname = "Lina", gender = Gender.FEMALE))
        assertEquals(Gender.FEMALE, guest.genderScope)
        assertFalse(guest.isSignedIn)
        assertTrue(GuestProfile().isEmpty)
        val user = SessionState.SignedIn(UserProfile(firstName = "Omar", gender = Gender.MALE))
        assertEquals(Gender.MALE, user.genderScope)
        assertTrue(user.isSignedIn)
    }
}
