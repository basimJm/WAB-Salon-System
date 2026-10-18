package com.wab.payments

import kotlin.coroutines.resume
import kotlinx.coroutines.suspendCancellableCoroutine
import platform.AuthenticationServices.ASPresentationAnchor
import platform.AuthenticationServices.ASWebAuthenticationPresentationContextProvidingProtocol
import platform.AuthenticationServices.ASWebAuthenticationSession
import platform.AuthenticationServices.ASWebAuthenticationSessionErrorCodeCanceledLogin
import platform.AuthenticationServices.ASWebAuthenticationSessionErrorDomain
import platform.Foundation.NSURL
import platform.UIKit.UIApplication
import platform.UIKit.UIWindow
import platform.darwin.NSObject

/**
 * iOS [InAppBrowser] on `ASWebAuthenticationSession`: the system sheet closes itself when the page
 * redirects to the app's custom scheme (the return URL must use one, e.g. `wab://payment/result`).
 */
public class WebAuthInAppBrowser : InAppBrowser {
    private val anchorProvider = object : NSObject(), ASWebAuthenticationPresentationContextProvidingProtocol {
        override fun presentationAnchorForWebAuthenticationSession(session: ASWebAuthenticationSession): ASPresentationAnchor =
            UIApplication.sharedApplication.keyWindow ?: UIWindow()
    }

    override suspend fun open(url: String, returnUrlPrefix: String): BrowserOutcome =
        suspendCancellableCoroutine { continuation ->
            val target = NSURL.URLWithString(url)
            val scheme = returnUrlPrefix.substringBefore("://", missingDelimiterValue = "")
            if (target == null || scheme.isEmpty()) {
                continuation.resume(BrowserOutcome.Error("Invalid payment page URL"))
                return@suspendCancellableCoroutine
            }
            val session = ASWebAuthenticationSession(target, scheme) { callback, error ->
                val outcome = when {
                    callback != null -> BrowserOutcome.Returned(callback.absoluteString.orEmpty())
                    error != null &&
                        error.domain == ASWebAuthenticationSessionErrorDomain &&
                        error.code == ASWebAuthenticationSessionErrorCodeCanceledLogin -> BrowserOutcome.Dismissed
                    else -> BrowserOutcome.Error(error?.localizedDescription)
                }
                if (continuation.isActive) continuation.resume(outcome)
            }
            session.presentationContextProvider = anchorProvider
            if (!session.start()) {
                continuation.resume(BrowserOutcome.Error("The payment page could not be started"))
                return@suspendCancellableCoroutine
            }
            continuation.invokeOnCancellation { session.cancel() }
        }
}
