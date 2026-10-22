package com.fab.wab.merchant.main

import android.content.Intent
import android.content.pm.ActivityInfo
import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.activity.enableEdgeToEdge
import com.fab.wab.merchant.app.deeplink.DeepLinkStore
import com.fab.wab.merchant.app.ui.App
import com.fab.wab.merchant.core.ui.media.AndroidImagePickerBridge
import com.fab.wab.merchant.core.notification.push.PushSignals
import com.fab.wab.merchant.core.ui.permission.AndroidPermissionBridge
import com.fab.wab.merchant.firebase.PushIntents
import org.koin.java.KoinJavaComponent.getKoin

class MainActivity : ComponentActivity() {
    override fun onCreate(savedInstanceState: Bundle?) {
        // Lock portrait on phones (< 600dp); tablets/iPad remain free-rotation
        if (resources.configuration.smallestScreenWidthDp < 600) {
            requestedOrientation = ActivityInfo.SCREEN_ORIENTATION_UNSPECIFIED
        }
        enableEdgeToEdge()
        super.onCreate(savedInstanceState)
        getKoin().get<AndroidPermissionBridge>().attach(this)
        getKoin().get<AndroidImagePickerBridge>().attach(this)
        getKoin().get<DeepLinkStore>().publish(intent?.dataString)
        PushIntents.fromIntent(intent)?.let(PushSignals::tapped)
        setContent {
            App(this)
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
        super.onDestroy()
    }

    override fun onResume() {
        super.onResume()
        getKoin().setProperty("androidActivity", this)
    }
}
