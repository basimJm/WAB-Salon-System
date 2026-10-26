package com.fab.wab.customer.feature.favorites.presentation

import com.fab.wab.customer.feature.favorites.presentation.screen.FavoriteStatus
import com.fab.wab.customer.feature.favorites.presentation.screen.favoriteStatusOf
import kotlin.test.Test
import kotlin.test.assertEquals

/** E2E (CUS-093): a salon closed only outside today's hours must not read "Closed today". */
class FavoriteStatusTest {

    @Test
    fun closedTodayOnlyWithoutHoursToday() {
        assertEquals(FavoriteStatus.Open("11:00 AM – 9:00 PM"), favoriteStatusOf(true, "11:00 AM – 9:00 PM"))
        assertEquals(FavoriteStatus.ClosedNow("11:00 AM – 9:00 PM"), favoriteStatusOf(false, "11:00 AM – 9:00 PM"))
        assertEquals(FavoriteStatus.ClosedToday, favoriteStatusOf(false, null))
        assertEquals(FavoriteStatus.ClosedToday, favoriteStatusOf(true, " "))
    }
}
