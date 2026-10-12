package com.fab.wab.customer.main

import android.content.pm.ActivityInfo
import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.activity.enableEdgeToEdge
import com.fab.wab.customer.app.ui.App
import com.fab.wab.customer.core.ui.permission.AndroidPermissionBridge
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
        setContent {
            App(this)
        }
    }

    override fun onDestroy() {
        getKoin().get<AndroidPermissionBridge>().detach()
        super.onDestroy()
    }

    override fun onResume() {
        super.onResume()
        getKoin().setProperty("androidActivity", this)
    }
}
