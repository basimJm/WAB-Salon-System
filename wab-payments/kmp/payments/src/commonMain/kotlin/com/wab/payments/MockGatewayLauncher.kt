package com.wab.payments

/** How an in-app browser session ended. */
public sealed interface BrowserOutcome {
    /** The page redirected to the return URL. */
    public data class Returned(val url: String) : BrowserOutcome

    /** The shopper closed the browser. */
    public data object Dismissed : BrowserOutcome

    public data class Error(val message: String?) : BrowserOutcome
}

/**
 * Shows a web page and reports when it navigates to [returnUrlPrefix]. Android uses a WebView
 * activity, iOS an `ASWebAuthenticationSession` (so the return URL must use a custom scheme there).
 */
public fun interface InAppBrowser {
    public suspend fun open(url: String, returnUrlPrefix: String): BrowserOutcome
}

/**
 * Dev launcher: opens the mock gateway's hosted pay page (`CheckoutSession.checkoutUrl`) in an
 * in-app browser and parses the redirect, so the whole booking flow runs without HyperPay.
 * Like every launcher it only reports what the device saw; the server's verify decides.
 */
public class MockGatewayLauncher(
    private val browser: InAppBrowser,
) : PaymentLauncher {
    override suspend fun launch(session: CheckoutSession): PaymentResult {
        session.validationError()?.let { return PaymentResult.Failed(session.sessionId, it) }
        val page = session.checkoutUrl
            ?: return PaymentResult.Failed(
                session.sessionId,
                PaymentError.configuration("The mock gateway session has no checkoutUrl"),
            )
        return when (val outcome = browser.open(page, session.shopperResultUrl)) {
            is BrowserOutcome.Returned ->
                ShopperResult.parse(session, outcome.url)
                    ?: PaymentResult.Failed(session.sessionId, PaymentError.unknown("Unexpected redirect from the payment page"))
            BrowserOutcome.Dismissed -> PaymentResult.Cancelled(session.sessionId)
            is BrowserOutcome.Error -> PaymentResult.Failed(session.sessionId, PaymentError.unknown(outcome.message))
        }
    }
}
