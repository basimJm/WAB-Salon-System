package com.wab.payments

import android.app.Activity
import android.content.Context
import android.content.Intent
import android.os.Bundle
import android.webkit.WebResourceRequest
import android.webkit.WebView
import android.webkit.WebViewClient
import java.util.UUID
import java.util.concurrent.ConcurrentHashMap
import kotlinx.coroutines.CompletableDeferred

/** Hand-over between [WebViewInAppBrowser] and the activity it starts (process-local, short-lived). */
internal object PendingBrowsers {
    private val pending = ConcurrentHashMap<String, CompletableDeferred<BrowserOutcome>>()

    fun register(id: String): CompletableDeferred<BrowserOutcome> =
        CompletableDeferred<BrowserOutcome>().also { pending[id] = it }

    fun complete(id: String, outcome: BrowserOutcome) {
        pending[id]?.complete(outcome)
    }

    fun forget(id: String) {
        pending.remove(id)
    }
}

/**
 * Android [InAppBrowser]: shows the page in a WebView activity and finishes as soon as the page
 * navigates to the return URL. For the dev mock gateway over plain HTTP the app's debug build needs a
 * network security config that allows that host (e.g. the emulator's host alias).
 */
public class WebViewInAppBrowser(context: Context) : InAppBrowser {
    private val appContext = context.applicationContext

    override suspend fun open(url: String, returnUrlPrefix: String): BrowserOutcome {
        val id = UUID.randomUUID().toString()
        val outcome = PendingBrowsers.register(id)
        return try {
            val intent = Intent(appContext, PaymentWebActivity::class.java)
                .addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
                .putExtra(PaymentWebActivity.EXTRA_ID, id)
                .putExtra(PaymentWebActivity.EXTRA_URL, url)
                .putExtra(PaymentWebActivity.EXTRA_RETURN_PREFIX, returnUrlPrefix)
            appContext.startActivity(intent)
            outcome.await()
        } finally {
            PendingBrowsers.forget(id)
        }
    }
}

/** Hosts the WebView. Declared in this library's manifest; not part of the public API. */
public class PaymentWebActivity : Activity() {
    private var id: String = ""
    private var finished = false

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        id = intent.getStringExtra(EXTRA_ID).orEmpty()
        val url = intent.getStringExtra(EXTRA_URL)
        val prefix = intent.getStringExtra(EXTRA_RETURN_PREFIX)
        if (url == null || prefix == null) {
            complete(BrowserOutcome.Error("Missing payment page"))
            return
        }
        val webView = WebView(this)
        webView.settings.javaScriptEnabled = true
        webView.webViewClient = object : WebViewClient() {
            override fun shouldOverrideUrlLoading(view: WebView, request: WebResourceRequest): Boolean {
                val target = request.url.toString()
                if (!target.startsWith(prefix, ignoreCase = true)) return false
                complete(BrowserOutcome.Returned(target))
                return true
            }
        }
        setContentView(webView)
        webView.loadUrl(url)
    }

    override fun onDestroy() {
        // Closed by the shopper (back button) before the page returned.
        if (!finished) PendingBrowsers.complete(id, BrowserOutcome.Dismissed)
        super.onDestroy()
    }

    private fun complete(outcome: BrowserOutcome) {
        finished = true
        PendingBrowsers.complete(id, outcome)
        finish()
    }

    internal companion object {
        const val EXTRA_ID: String = "com.wab.payments.ID"
        const val EXTRA_URL: String = "com.wab.payments.URL"
        const val EXTRA_RETURN_PREFIX: String = "com.wab.payments.RETURN_PREFIX"
    }
}
