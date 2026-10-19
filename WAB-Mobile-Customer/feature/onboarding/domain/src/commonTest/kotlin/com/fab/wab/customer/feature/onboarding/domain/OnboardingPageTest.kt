package com.fab.wab.customer.feature.onboarding.domain

import com.fab.wab.customer.feature.onboarding.domain.model.OnboardingPage
import kotlin.test.Test
import kotlin.test.assertEquals
import kotlin.test.assertFalse
import kotlin.test.assertTrue

class OnboardingPageTest {

    @Test
    fun fourPagesWithTheLastOneClosing() {
        assertEquals(4, OnboardingPage.count)
        assertFalse(OnboardingPage.DISCOVER.isLast)
        assertTrue(OnboardingPage.PAY.isLast)
        assertEquals(OnboardingPage.PAY, OnboardingPage.at(99))
        assertEquals(OnboardingPage.DISCOVER, OnboardingPage.at(-1))
    }
}
