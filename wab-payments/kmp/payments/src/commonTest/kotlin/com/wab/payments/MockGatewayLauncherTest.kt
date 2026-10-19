package com.wab.payments

import kotlin.test.Test
import kotlin.test.assertEquals
import kotlin.test.assertIs
import kotlinx.coroutines.test.runTest

class MockGatewayLauncherTest {
    private class FakeBrowser(private val outcome: BrowserOutcome) : InAppBrowser {
        var opened: Pair<String, String>? = null

        override suspend fun open(url: String, returnUrlPrefix: String): BrowserOutcome {
            opened = url to returnUrlPrefix
            return outcome
        }
    }

    private val page = "http://10.0.2.2:4010/checkout/chk-1.mock"
    private val withPage = session(checkoutUrl = page)

    @Test
    fun opensTheHostedPageAndParsesTheRedirect() = runTest {
        val browser = FakeBrowser(
            BrowserOutcome.Returned("wab://payment/result?id=chk-1&resourcePath=%2Fv1%2Fcheckouts%2Fchk-1%2Fpayment"),
        )
        val result = MockGatewayLauncher(browser).launch(withPage)
        assertEquals(PaymentResult.ClientCompleted("chk-1", "/v1/checkouts/chk-1/payment"), result)
        assertEquals(page to "wab://payment/result", browser.opened)
    }

    @Test
    fun dismissingTheBrowserIsACancellation() = runTest {
        assertEquals(
            PaymentResult.Cancelled("chk-1"),
            MockGatewayLauncher(FakeBrowser(BrowserOutcome.Dismissed)).launch(withPage),
        )
    }

    @Test
    fun browserErrorsAndForeignRedirectsAreTypedFailures() = runTest {
        val error = assertIs<PaymentResult.Failed>(
            MockGatewayLauncher(FakeBrowser(BrowserOutcome.Error("tls 4111111111111111"))).launch(withPage),
        )
        assertEquals("tls [redacted]", error.error.message)
        val foreign = assertIs<PaymentResult.Failed>(
            MockGatewayLauncher(FakeBrowser(BrowserOutcome.Returned("https://evil.example.com/"))).launch(withPage),
        )
        assertEquals(PaymentErrorCode.UNKNOWN, foreign.error.code)
        val otherCheckout = assertIs<PaymentResult.Failed>(
            MockGatewayLauncher(FakeBrowser(BrowserOutcome.Returned("wab://payment/result?id=zzz"))).launch(withPage),
        )
        assertEquals(PaymentErrorCode.INVALID_SESSION, otherCheckout.error.code)
    }

    @Test
    fun needsACheckoutUrlAndAValidSessionAndNeverOpensTheBrowserOtherwise() = runTest {
        val browser = FakeBrowser(BrowserOutcome.Dismissed)
        val launcher = MockGatewayLauncher(browser)
        val noPage = assertIs<PaymentResult.Failed>(launcher.launch(session()))
        assertEquals(PaymentErrorCode.CONFIGURATION, noPage.error.code)
        val invalid = assertIs<PaymentResult.Failed>(launcher.launch(session(checkoutId = "", checkoutUrl = page)))
        assertEquals(PaymentErrorCode.INVALID_SESSION, invalid.error.code)
        assertEquals(null, browser.opened)
    }
}
