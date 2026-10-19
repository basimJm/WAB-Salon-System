package com.wab.payments.hyperpay

import android.content.Context
import android.content.Intent
import com.oppwa.mobile.connect.checkout.dialog.CheckoutActivity
import com.oppwa.mobile.connect.checkout.meta.CheckoutSettings
import com.oppwa.mobile.connect.exception.PaymentError
import com.oppwa.mobile.connect.provider.Connect
import com.oppwa.mobile.connect.provider.Transaction
import com.wab.payments.NativeCheckoutBridge
import com.wab.payments.NativeCheckoutRequest
import com.wab.payments.NativeOutcome
import com.wab.payments.PaymentEnvironment
import com.wab.payments.SdkResultKind
import com.wab.payments.sdkOutcome

/**
 * Opens the HyperPay (OPP) ready-to-use checkout for a server-created checkout id and maps what the
 * SDK returns. Wrap it in `NativeCheckoutLauncher` and register it under provider `hyperpay`.
 *
 * Written against the OPP Android SDK documentation; NOT compiled or run in the build sandbox (the
 * SDK is not publicly resolvable there). The device result is never final: the app must still call
 * its server's verify endpoint.
 *
 * Async payments (3-D Secure redirects) return to the app through the deep link of `shopperResultUrl`:
 * the app declares an intent filter for that scheme on [CheckoutActivity] (see `kmp/docs/android.md`).
 */
public class HyperPayAndroidBridge(
    context: Context,
    private val activities: CheckoutActivityHost,
    /** Optional UI language for the SDK screens (`ar` / `en`). */
    private val languageTag: () -> String? = { null },
) : NativeCheckoutBridge {
    private val appContext = context.applicationContext

    override fun present(request: NativeCheckoutRequest, completion: (NativeOutcome) -> Unit) {
        val settings = CheckoutSettings(request.checkoutId, request.brands.toSet(), providerMode(request.environment))
        settings.shopperResultUrl = request.shopperResultUrl
        languageTag()?.let { settings.locale = it }
        val intent = Intent(appContext, CheckoutActivity::class.java)
            .putExtra(CheckoutActivity.CHECKOUT_SETTINGS, settings)
            .addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
        activities.start(intent) { resultCode, data -> completion(toOutcome(resultCode, data)) }
    }

    private fun providerMode(environment: PaymentEnvironment): Connect.ProviderMode = when (environment) {
        PaymentEnvironment.DEV -> Connect.ProviderMode.TEST
        PaymentEnvironment.PROD -> Connect.ProviderMode.LIVE
    }

    private fun toOutcome(resultCode: Int, data: Intent?): NativeOutcome = when (resultCode) {
        CheckoutActivity.RESULT_OK -> {
            val transaction: Transaction? = data?.getParcelableExtra(CheckoutActivity.CHECKOUT_RESULT_TRANSACTION)
            sdkOutcome(
                SdkResultKind.COMPLETED,
                resourcePath = data?.getStringExtra(CheckoutActivity.CHECKOUT_RESULT_RESOURCE_PATH),
                redirectUrl = transaction?.redirectUrl,
            )
        }
        CheckoutActivity.RESULT_CANCELED -> sdkOutcome(SdkResultKind.CANCELED)
        CheckoutActivity.RESULT_ERROR -> {
            val error: PaymentError? = data?.getParcelableExtra(CheckoutActivity.CHECKOUT_RESULT_ERROR)
            sdkOutcome(
                SdkResultKind.ERROR,
                errorCode = error?.errorCode?.name,
                errorMessage = error?.errorMessage,
            )
        }
        else -> sdkOutcome(SdkResultKind.ERROR, errorCode = "UNEXPECTED_RESULT", errorMessage = "Unexpected checkout result")
    }
}
