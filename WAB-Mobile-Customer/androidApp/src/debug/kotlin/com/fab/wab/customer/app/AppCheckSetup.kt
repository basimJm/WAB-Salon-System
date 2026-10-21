package com.fab.wab.customer.app

import android.content.Context
import com.google.firebase.FirebaseApp
import com.google.firebase.appcheck.FirebaseAppCheck
import com.google.firebase.appcheck.debug.DebugAppCheckProviderFactory

/**
 * Debug builds use the App Check debug provider: the debug token is printed in Logcat (tag
 * DebugAppCheckProvider) and must be added in Firebase → App Check → Manage debug tokens. Skipped when Firebase
 * is not initialised (placeholder config).
 */
internal fun installAppCheck(context: Context) {
    if (FirebaseApp.getApps(context).isEmpty()) return
    FirebaseAppCheck.getInstance().installAppCheckProviderFactory(DebugAppCheckProviderFactory.getInstance())
}
