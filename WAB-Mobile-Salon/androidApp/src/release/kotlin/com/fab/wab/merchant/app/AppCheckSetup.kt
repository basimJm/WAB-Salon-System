package com.fab.wab.merchant.app

import android.content.Context
import android.util.Log
import com.google.firebase.FirebaseApp
import com.google.firebase.appcheck.FirebaseAppCheck
import com.google.firebase.appcheck.playintegrity.PlayIntegrityAppCheckProviderFactory

/**
 * Release builds attest with Play Integrity (needs the app in Play Console and the SHA-256 in Firebase). Skipped
 * when Firebase is not initialised (placeholder config).
 */
internal fun installAppCheck(context: Context) {
    if (FirebaseApp.getApps(context).isEmpty()) return
    val appCheck = FirebaseAppCheck.getInstance()
    appCheck.installAppCheckProviderFactory(PlayIntegrityAppCheckProviderFactory.getInstance())
    // Same tag as the phone-auth trail: a failed App Check token is a common reason Firebase silently drops SMS.
    appCheck.getAppCheckToken(false).addOnCompleteListener { task ->
        if (task.isSuccessful) {
            Log.i(PHONE_AUTH_TAG, "appCheck token OK (provider=playIntegrity)")
        } else {
            Log.w(PHONE_AUTH_TAG, "appCheck token FAILED: ${task.exception?.message}")
        }
    }
}

private const val PHONE_AUTH_TAG = "Merchant-PhoneAuth"
