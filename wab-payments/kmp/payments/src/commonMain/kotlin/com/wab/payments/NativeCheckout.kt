package com.wab.payments

import kotlin.coroutines.resume
import kotlinx.coroutines.suspendCancellableCoroutine

/** What the native gateway SDK needs to open its checkout (no card data, no secrets). */
public data class NativeCheckoutRequest(
    val checkoutId: String,
    val brands: List<String>,
    val shopperResultUrl: String,
    val environment: PaymentEnvironment,
)

/** How the native SDK ended, in platform-neutral terms. Platform wrappers only translate into this. */
public sealed interface NativeOutcome {
    /** The SDK finished; [resourcePath] / [redirectUrl] come from its transaction object. */
    public data class Finished(val resourcePath: String?, val redirectUrl: String? = null) : NativeOutcome

    public data object Cancelled : NativeOutcome

    public data class Error(val sdkCode: String?, val message: String?, val retryable: Boolean = false) : NativeOutcome
}

/**
 * The seam to the gateway's native SDK. Android implements it with the HyperPay Android SDK
 * (module `payments-hyperpay-android`); iOS implements it in Swift with the OPPWAMobile framework
 * (reference file in `kmp/docs/ios`). [present] must call [completion] exactly once, on any thread.
 */
public interface NativeCheckoutBridge {
    public fun present(request: NativeCheckoutRequest, completion: (NativeOutcome) -> Unit)
}

/** Drives any [NativeCheckoutBridge]: the shared half of the Android and iOS HyperPay launchers. */
public class NativeCheckoutLauncher(
    private val bridge: NativeCheckoutBridge,
) : PaymentLauncher {
    override suspend fun launch(session: CheckoutSession): PaymentResult {
        session.validationError()?.let { return PaymentResult.Failed(session.sessionId, it) }
        val request = NativeCheckoutRequest(session.checkoutId, session.brands, session.shopperResultUrl, session.environment)
        val outcome = suspendCancellableCoroutine { continuation ->
            var resumed = false
            bridge.present(request) { result ->
                if (!resumed && continuation.isActive) {
                    resumed = true
                    continuation.resume(result)
                }
            }
        }
        return outcome.toResult(session.sessionId)
    }
}

/** Translates an SDK outcome into the app-facing result. */
public fun NativeOutcome.toResult(sessionId: String): PaymentResult = when (this) {
    is NativeOutcome.Finished ->
        PaymentResult.ClientCompleted(sessionId, resourcePath ?: redirectUrl?.let { ShopperResult.queryOf(it)[ShopperResult.RESOURCE_PATH] })
    NativeOutcome.Cancelled -> PaymentResult.Cancelled(sessionId)
    is NativeOutcome.Error -> PaymentResult.Failed(sessionId, PaymentError.sdk(sdkCode, message, retryable))
}
