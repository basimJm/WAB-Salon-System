package com.fab.wab.merchant.core.ui.external

import kotlin.coroutines.resume
import kotlinx.coroutines.suspendCancellableCoroutine
import platform.Foundation.NSURL
import platform.UIKit.UIApplication
import platform.UIKit.UIViewController
import platform.UIKit.UIWindow
import platform.UIKit.UIWindowScene

/** UIKit plumbing shared by the hand-offs, pickers and settings shortcuts. */
object IosUiKit {

    /**
     * Opens [url] with `open(_:options:completionHandler:)` and answers whether another app took it. The one-argument
     * `openURL(_:)` is a no-op since iOS 18 ("BUG IN CLIENT OF UIKIT … Force returning false"), which is why calls,
     * WhatsApp, maps and the settings shortcut did nothing on current iPhones.
     */
    suspend fun open(url: String): Boolean {
        val nsUrl = NSURL.URLWithString(url) ?: return false
        return suspendCancellableCoroutine { continuation ->
            UIApplication.sharedApplication.openURL(nsUrl, options = emptyMap<Any?, Any?>()) { opened ->
                if (continuation.isActive) continuation.resume(opened)
            }
        }
    }

    /** Fire-and-forget variant for non-suspending callers (settings shortcuts). */
    fun openNow(url: String) {
        val nsUrl = NSURL.URLWithString(url) ?: return
        UIApplication.sharedApplication.openURL(nsUrl, options = emptyMap<Any?, Any?>(), completionHandler = null)
    }

    /** Whether an installed app handles [url]; the scheme must be listed in `LSApplicationQueriesSchemes`. */
    fun canOpen(url: String): Boolean = NSURL.URLWithString(url)?.let { UIApplication.sharedApplication.canOpenURL(it) } ?: false

    /**
     * The controller to present from: the key window of the foreground scene, then down the chain of presented
     * controllers. Presenting from the root while something is already presented fails silently, and a picker that
     * never appears never calls back.
     */
    fun topViewController(): UIViewController? {
        val windows = UIApplication.sharedApplication.connectedScenes
            .filterIsInstance<UIWindowScene>()
            .flatMap { scene -> scene.windows.filterIsInstance<UIWindow>() }
        val window = windows.firstOrNull { it.isKeyWindow() } ?: windows.firstOrNull()
        var top: UIViewController? = window?.rootViewController
        while (true) {
            val presented = top?.presentedViewController
            if (presented == null || presented.isBeingDismissed()) break
            top = presented
        }
        return top
    }
}
