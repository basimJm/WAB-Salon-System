package com.fab.wab.merchant.main

import android.content.Intent
import android.content.pm.ActivityInfo
import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.activity.enableEdgeToEdge
import com.fab.wab.merchant.app.deeplink.DeepLinkStore
import com.fab.wab.merchant.app.ui.App
import com.fab.wab.merchant.core.notification.push.PushSignals
import com.fab.wab.merchant.core.ui.media.AndroidFilePickerBridge
import com.fab.wab.merchant.core.ui.media.AndroidImagePickerBridge
import com.fab.wab.merchant.core.ui.permission.AndroidPermissionBridge
import com.fab.wab.merchant.firebase.PushIntents
import org.koin.java.KoinJavaComponent.getKoin

/** Below this smallest width (dp) the device is a phone. */
private const val PHONE_MAX_SMALLEST_WIDTH_DP = 600

class MainActivity : ComponentActivity() {
    override fun onCreate(savedInstanceState: Bundle?) {
        // Lock portrait on phones (< 600dp); tablets/iPad remain free-rotation
        if (resources.configuration.smallestScreenWidthDp < PHONE_MAX_SMALLEST_WIDTH_DP) {
            requestedOrientation = ActivityInfo.SCREEN_ORIENTATION_UNSPECIFIED
        }
        enableEdgeToEdge()
        super.onCreate(savedInstanceState)
        getKoin().get<AndroidPermissionBridge>().attach(this)
        getKoin().get<AndroidImagePickerBridge>().attach(this)
        getKoin().get<AndroidFilePickerBridge>().attach(this)
        getKoin().get<DeepLinkStore>().publish(intent?.dataString)
        PushIntents.fromIntent(intent)?.let(PushSignals::tapped)
        setContent {
            App()
        }
    }

    /** App Links arriving while the activity is alive (`singleTop`). */
    override fun onNewIntent(intent: Intent) {
        super.onNewIntent(intent)
        setIntent(intent)
        getKoin().get<DeepLinkStore>().publish(intent.dataString)
        PushIntents.fromIntent(intent)?.let(PushSignals::tapped)
    }

    override fun onDestroy() {
        getKoin().get<AndroidPermissionBridge>().detach()
        getKoin().get<AndroidImagePickerBridge>().detach()
        getKoin().get<AndroidFilePickerBridge>().detach()
        super.onDestroy()
    }
}
