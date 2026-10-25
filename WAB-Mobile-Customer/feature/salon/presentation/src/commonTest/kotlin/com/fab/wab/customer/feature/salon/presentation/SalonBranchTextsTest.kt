package com.fab.wab.customer.feature.salon.presentation

import com.fab.wab.customer.feature.salon.presentation.controller.vm.mapsLabel
import com.fab.wab.customer.feature.salon.presentation.screen.branchChipText
import kotlin.test.Test
import kotlin.test.assertEquals

/** Branch selector chips and the maps pin label of S07 (BUSINESS_DOMAIN §5.17). */
class SalonBranchTextsTest {
    @Test
    fun mainBranchChipCarriesTheMainMark() {
        assertEquals("Abdoun · Main", branchChipText("Abdoun", isMain = true, mainLabel = "Main", separator = " · "))
        assertEquals("Khalda", branchChipText("Khalda", isMain = false, mainLabel = "Main", separator = " · "))
    }

    @Test
    fun mapsLabelNamesTheBranchWhenOneIsSelected() {
        assertEquals("Hifa Salon - Mecca Street", mapsLabel("Hifa Salon", "Mecca Street"))
        assertEquals("Hifa Salon", mapsLabel("Hifa Salon", null))
        assertEquals("Hifa Salon", mapsLabel("Hifa Salon", " "))
    }
}
