package com.wab.payments

/**
 * Builds the HyperPay launcher for iOS from the Swift [bridge] (a class implementing
 * [NativeCheckoutBridge] on top of the OPPWAMobile framework, see `kmp/ios/HyperPayCheckoutBridge.swift`).
 * Register the result under provider `hyperpay` in [DelegatingPaymentLauncher].
 */
public fun hyperPayIosLauncher(bridge: NativeCheckoutBridge): PaymentLauncher = NativeCheckoutLauncher(bridge)

/**
 * Swift-friendly constructors for the three ways the OPP SDK can end, so the Swift bridge does not
 * have to build Kotlin sealed classes by hand. Error texts are scrubbed later by the common mapping.
 */
public object IosOutcomes {
    public fun completed(resourcePath: String?, redirectUrl: String?): NativeOutcome =
        sdkOutcome(SdkResultKind.COMPLETED, resourcePath = resourcePath, redirectUrl = redirectUrl)

    public fun cancelled(): NativeOutcome = sdkOutcome(SdkResultKind.CANCELED)

    public fun failed(code: String?, message: String?): NativeOutcome =
        sdkOutcome(SdkResultKind.ERROR, errorCode = code, errorMessage = message)
}
