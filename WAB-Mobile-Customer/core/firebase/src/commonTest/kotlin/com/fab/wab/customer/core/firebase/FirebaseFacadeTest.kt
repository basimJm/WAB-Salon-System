package com.fab.wab.customer.core.firebase

import kotlinx.coroutines.flow.first
import kotlinx.coroutines.test.runTest
import kotlin.test.Test
import kotlin.test.assertEquals
import kotlin.test.assertIs

class FirebaseFacadeTest {

    private fun failure(code: Int, stage: PhoneAuthStage = PhoneAuthStage.Start, message: String? = null) =
        authFailureForCode(code, stage, message)

    @Test
    fun iosAuthCodesMapToVendorNeutralFailures() {
        assertEquals(FirebaseFailure.InvalidPhone, failure(FirebaseAuthErrorCodes.INVALID_PHONE_NUMBER))
        assertEquals(FirebaseFailure.InvalidPhone, failure(FirebaseAuthErrorCodes.MISSING_PHONE_NUMBER))
        assertEquals(FirebaseFailure.InvalidCode, failure(FirebaseAuthErrorCodes.INVALID_VERIFICATION_CODE, PhoneAuthStage.Confirm))
        assertEquals(FirebaseFailure.CodeExpired, failure(FirebaseAuthErrorCodes.SESSION_EXPIRED, PhoneAuthStage.Confirm))
        assertEquals(FirebaseFailure.TooManyRequests, failure(FirebaseAuthErrorCodes.TOO_MANY_REQUESTS))
        assertEquals(FirebaseFailure.TooManyRequests, failure(FirebaseAuthErrorCodes.QUOTA_EXCEEDED))
        assertEquals(FirebaseFailure.Network, failure(FirebaseAuthErrorCodes.NETWORK_ERROR, PhoneAuthStage.Confirm))
        assertEquals(FirebaseFailure.Unknown("boom"), failure(-1, message = "boom"))
    }

    @Test
    fun fakePhoneAuthRecordsCallsAndReturnsTheScript() = runTest {
        val gateway = FakePhoneAuthGateway()
        val started = gateway.startVerification("+962791234567")
        assertIs<FirebaseResult.Success<PhoneVerification>>(started)
        assertEquals(FakePhoneAuthGateway.DEFAULT_VERIFICATION_ID, started.value.id)
        gateway.confirmResult = FirebaseResult.Failure(FirebaseFailure.InvalidCode)
        assertEquals(FirebaseResult.Failure(FirebaseFailure.InvalidCode), gateway.confirm(started.value, "000000"))
        gateway.signOut()
        assertEquals(listOf("+962791234567"), gateway.startedPhones)
        assertEquals(listOf("000000"), gateway.confirmedCodes)
        assertEquals(1, gateway.signedOut)
    }

    @Test
    fun pushTokenRelayReplaysTheLatestToken() = runTest {
        PushTokenRelay.publish("token-1")
        PushTokenRelay.publish("token-2")
        assertEquals("token-2", FakePushTokenProvider().tokenUpdates.first())
        assertEquals("stored", FakePushTokenProvider("stored").currentToken())
    }

    @Test
    fun fakeCrashReporterKeepsEverything() {
        val reporter = FakeCrashReporter()
        reporter.log("opened salon")
        reporter.recordNonFatal(IllegalStateException("x"))
        reporter.setUserId("c1")
        assertEquals(listOf("opened salon"), reporter.logs)
        assertEquals(1, reporter.nonFatals.size)
        assertEquals("c1", reporter.userId)
    }
}
