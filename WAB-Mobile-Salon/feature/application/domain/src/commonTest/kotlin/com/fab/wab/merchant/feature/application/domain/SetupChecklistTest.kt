package com.fab.wab.merchant.feature.application.domain

import com.fab.wab.merchant.core.domain.salon.CompletenessItem
import com.fab.wab.merchant.feature.application.domain.model.SetupStep
import com.fab.wab.merchant.feature.application.domain.model.requiredDone
import com.fab.wab.merchant.feature.application.domain.model.requiredTotal
import com.fab.wab.merchant.feature.application.domain.model.setupChecklistOf
import kotlin.test.Test
import kotlin.test.assertEquals
import kotlin.test.assertFalse
import kotlin.test.assertTrue

class SetupChecklistTest {
    @Test
    fun requiredStepsFollowTheMissingItems() {
        val list = setupChecklistOf(setOf(CompletenessItem.COVER, CompletenessItem.STAFF))
        assertFalse(list.first { it.step == SetupStep.PROFILE }.done)
        assertTrue(list.first { it.step == SetupStep.LOCATION }.done)
        assertFalse(list.first { it.step == SetupStep.STAFF }.done)
        assertEquals(4, list.requiredDone)
        assertEquals(6, list.requiredTotal)
    }

    @Test
    fun aCompleteSalonTicksEveryRequiredStepAndNoOptionalOne() {
        val list = setupChecklistOf(emptySet())
        assertEquals(6, list.requiredDone)
        assertTrue(list.filterNot { it.step.required }.none { it.done })
    }
}
