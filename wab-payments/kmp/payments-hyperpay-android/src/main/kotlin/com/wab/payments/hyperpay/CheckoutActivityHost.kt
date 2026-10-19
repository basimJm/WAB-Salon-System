package com.wab.payments.hyperpay

import android.content.Intent
import androidx.activity.result.ActivityResultRegistry
import androidx.activity.result.contract.ActivityResultContracts
import java.util.UUID

/**
 * Starts an activity and reports its result. The app implements it with its own activity result
 * machinery (or [ActivityResultRegistryHost]); the library never holds an Activity reference.
 */
public fun interface CheckoutActivityHost {
    /** Must call [onResult] exactly once, with the activity's `resultCode` and result data. */
    public fun start(intent: Intent, onResult: (resultCode: Int, data: Intent?) -> Unit)
}

/**
 * [CheckoutActivityHost] on an [ActivityResultRegistry] (take it from `ComponentActivity.activityResultRegistry`).
 * Each call registers a one-shot launcher and unregisters it when the result arrives.
 */
public class ActivityResultRegistryHost(
    private val registry: ActivityResultRegistry,
) : CheckoutActivityHost {
    override fun start(intent: Intent, onResult: (resultCode: Int, data: Intent?) -> Unit) {
        val key = "$KEY_PREFIX${UUID.randomUUID()}"
        lateinit var launcher: androidx.activity.result.ActivityResultLauncher<Intent>
        launcher = registry.register(key, ActivityResultContracts.StartActivityForResult()) { result ->
            launcher.unregister()
            onResult(result.resultCode, result.data)
        }
        launcher.launch(intent)
    }

    private companion object {
        const val KEY_PREFIX: String = "com.wab.payments.checkout."
    }
}
