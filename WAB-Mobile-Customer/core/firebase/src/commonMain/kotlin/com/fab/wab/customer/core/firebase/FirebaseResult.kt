package com.fab.wab.customer.core.firebase

/** Why a Firebase call failed, vendor-neutral so features map it to localized text (PRD S13 messages). */
sealed interface FirebaseFailure {
    data object InvalidPhone : FirebaseFailure
    data object InvalidCode : FirebaseFailure
    data object CodeExpired : FirebaseFailure
    data object TooManyRequests : FirebaseFailure
    data object Network : FirebaseFailure

    /** No implementation registered (iOS before the Swift bridge, previews, tests without Firebase). */
    data object Unavailable : FirebaseFailure
    data class Unknown(val message: String?) : FirebaseFailure
}

sealed interface FirebaseResult<out T> {
    data class Success<T>(val value: T) : FirebaseResult<T>
    data class Failure(val failure: FirebaseFailure) : FirebaseResult<Nothing>
}

/** Which call failed: the same vendor code means "invalid phone" when starting and "invalid code" when confirming. */
enum class PhoneAuthStage { Start, Confirm }

/** Firebase Auth error codes as the iOS SDK reports them (`FIRAuthErrorCode`); the Android SDK maps by exception type. */
object FirebaseAuthErrorCodes {
    const val INVALID_PHONE_NUMBER = 17042
    const val MISSING_PHONE_NUMBER = 17041
    const val INVALID_VERIFICATION_CODE = 17044
    const val SESSION_EXPIRED = 17051
    const val TOO_MANY_REQUESTS = 17010
    const val QUOTA_EXCEEDED = 17052
    const val NETWORK_ERROR = 17020
}

/** Maps an iOS Firebase Auth error code to a failure; pure so it is unit-tested. */
fun authFailureForCode(code: Int, stage: PhoneAuthStage, message: String?): FirebaseFailure = when (code) {
    FirebaseAuthErrorCodes.INVALID_PHONE_NUMBER, FirebaseAuthErrorCodes.MISSING_PHONE_NUMBER -> FirebaseFailure.InvalidPhone
    FirebaseAuthErrorCodes.INVALID_VERIFICATION_CODE -> FirebaseFailure.InvalidCode
    FirebaseAuthErrorCodes.SESSION_EXPIRED -> FirebaseFailure.CodeExpired
    FirebaseAuthErrorCodes.TOO_MANY_REQUESTS, FirebaseAuthErrorCodes.QUOTA_EXCEEDED -> FirebaseFailure.TooManyRequests
    FirebaseAuthErrorCodes.NETWORK_ERROR -> FirebaseFailure.Network
    else -> if (stage == PhoneAuthStage.Confirm && message == null) FirebaseFailure.Unknown(null) else FirebaseFailure.Unknown(message)
}
