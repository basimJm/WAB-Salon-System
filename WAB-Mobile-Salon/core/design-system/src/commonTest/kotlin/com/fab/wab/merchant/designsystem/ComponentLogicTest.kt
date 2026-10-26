package com.fab.wab.merchant.designsystem

import com.fab.wab.merchant.designsystem.components.avatar.initialsOf
import com.fab.wab.merchant.designsystem.components.badge.countBadgeLabel
import com.fab.wab.merchant.designsystem.components.rating.starFill
import com.fab.wab.merchant.designsystem.components.stepper.StepState
import com.fab.wab.merchant.designsystem.components.stepper.stepState
import com.fab.wab.merchant.designsystem.components.textfield.sanitizeOtp
import kotlin.test.Test
import kotlin.test.assertEquals
import kotlin.test.assertNull

class ComponentLogicTest {
    @Test
    fun countBadgeHidesZeroAndCapsAtNinetyNine() {
        assertNull(countBadgeLabel(0))
        assertNull(countBadgeLabel(-3))
        assertEquals("1", countBadgeLabel(1))
        assertEquals("99", countBadgeLabel(99))
        assertEquals("99+", countBadgeLabel(100))
        assertEquals("99+", countBadgeLabel(12_345))
    }

    @Test
    fun starFillSupportsDecimalRatings() {
        assertEquals(1f, starFill(0, 4.5f))
        assertEquals(1f, starFill(3, 4.5f))
        assertEquals(0.5f, starFill(4, 4.5f))
        assertEquals(0f, starFill(4, 4f))
        assertEquals(0f, starFill(0, -2f))
        assertEquals(1f, starFill(4, 99f))
    }

    @Test
    fun stepStatesFollowTheCurrentStep() {
        assertEquals(StepState.Done, stepState(0, 2))
        assertEquals(StepState.Current, stepState(2, 2))
        assertEquals(StepState.Upcoming, stepState(3, 2))
    }

    @Test
    fun otpKeepsOnlyDigitsUpToTheBackendLength() {
        assertEquals("123456", sanitizeOtp("123456789", 6))
        assertEquals("12", sanitizeOtp("1a2b", 6))
        assertEquals("", sanitizeOtp("abc", 6))
        assertEquals("1234", sanitizeOtp("1234", 4))
        assertEquals("", sanitizeOtp("123", 0))
    }

    @Test
    fun otpAcceptsArabicIndicDigits() {
        assertEquals("123", sanitizeOtp("١٢٣", 6))
        assertEquals("456", sanitizeOtp("۴۵۶", 6))
        assertEquals("123", sanitizeOtp("1٢3", 6))
    }

    @Test
    fun otpPasteOfAWholeCodeReplacesTheTypedDigits() {
        // Typed "12", then pasted the WhatsApp code after or before it in the hidden field.
        assertEquals("482193", sanitizeOtp("12482193", 6, previous = "12"))
        assertEquals("482193", sanitizeOtp("48219312", 6, previous = "12"))
        // A pasted message keeps only the code.
        assertEquals("482193", sanitizeOtp("Your WAB code: 482193", 6))
        // A seventh typed digit on a full code is ignored; a single typed digit is appended.
        assertEquals("123456", sanitizeOtp("1234567", 6, previous = "123456"))
        assertEquals("123", sanitizeOtp("123", 6, previous = "12"))
    }

    @Test
    fun otpAfterARefusedCodeTheNextDigitStartsANewCode() {
        assertEquals("4", sanitizeOtp("0000004", 6, previous = "000000", restart = true))
        assertEquals("4", sanitizeOtp("4000000", 6, previous = "000000", restart = true))
        // Deleting edits the refused code; a pasted code still replaces it.
        assertEquals("00000", sanitizeOtp("00000", 6, previous = "000000", restart = true))
        assertEquals("482193", sanitizeOtp("000000482193", 6, previous = "000000", restart = true))
    }

    @Test
    fun initialsUseTheFirstLettersOfAtMostTwoWords() {
        assertEquals("AJ", initialsOf("amal jaber"))
        assertEquals("AJ", initialsOf("  Amal  Jaber Khalil "))
        assertEquals("A", initialsOf("Amal"))
        assertEquals("", initialsOf("   "))
        assertEquals("س", initialsOf("سارة"))
    }
}
