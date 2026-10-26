package com.fab.wab.customer.feature.salon.presentation

import com.fab.wab.customer.feature.salon.presentation.screen.ReviewCardStyle
import com.fab.wab.customer.feature.salon.presentation.screen.SalonDesign
import kotlin.test.Test
import kotlin.test.assertEquals
import kotlin.test.assertFalse
import kotlin.test.assertTrue

/**
 * CUS-092: S07 showed a dead "See more" under every review, even one-line comments. The salon preview now truncates
 * to the preview lines and expands in place only on real overflow; the S08 list shows the full comment.
 */
class ReviewCardStyleTest {

    @Test
    fun salonPreviewTruncatesAndExpandsInPlace() {
        assertEquals(SalonDesign.REVIEW_PREVIEW_LINES, ReviewCardStyle.SalonPreview.collapsedLines)
        assertTrue(ReviewCardStyle.SalonPreview.expandsInPlace)
    }

    @Test
    fun staffPreviewStaysCompactWithoutAction() {
        assertEquals(SalonDesign.REVIEW_PREVIEW_LINES, ReviewCardStyle.StaffPreview.collapsedLines)
        assertFalse(ReviewCardStyle.StaffPreview.expandsInPlace)
    }

    @Test
    fun listShowsTheWholeComment() {
        assertEquals(Int.MAX_VALUE, ReviewCardStyle.List.collapsedLines)
        assertFalse(ReviewCardStyle.List.expandsInPlace)
    }
}
