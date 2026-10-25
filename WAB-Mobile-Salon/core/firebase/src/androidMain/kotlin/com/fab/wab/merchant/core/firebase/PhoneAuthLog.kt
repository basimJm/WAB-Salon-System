package com.fab.wab.merchant.core.firebase

import android.util.Log
import com.google.firebase.FirebaseException
import com.google.firebase.auth.FirebaseAuthException

/**
 * Logcat trail of every Firebase Phone Auth step (tag `-PhoneAuth`), so a missing SMS can be traced:
 * `adb logcat -s -PhoneAuth`. Phone numbers are masked; codes and tokens are never logged.
 */
internal object PhoneAuthLog {
    const val TAG = "Merchant-PhoneAuth"
    private const val VISIBLE_PREFIX = 4
    private const val VISIBLE_SUFFIX = 3
    private const val ID_PREVIEW = 8

    fun mask(phoneE164: String): String =
        if (phoneE164.length <= VISIBLE_PREFIX + VISIBLE_SUFFIX) phoneE164
        else phoneE164.take(VISIBLE_PREFIX) + "*".repeat(phoneE164.length - VISIBLE_PREFIX - VISIBLE_SUFFIX) +
            phoneE164.takeLast(VISIBLE_SUFFIX)

    fun preview(id: String): String = id.take(ID_PREVIEW) + "…"

    fun info(message: String) {
        Log.i(TAG, message)
    }

    fun failure(step: String, error: Throwable?) {
        val code = (error as? FirebaseAuthException)?.errorCode
        val type = error?.javaClass?.simpleName
        Log.w(TAG, "$step FAILED type=$type errorCode=$code message=${error?.message}", error as? FirebaseException)
    }
}
