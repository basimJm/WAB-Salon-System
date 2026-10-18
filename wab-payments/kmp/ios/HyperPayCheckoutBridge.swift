// Reference implementation of the HyperPay (OPP) checkout bridge for the iOS customer app.
//
// UNVERIFIED: written from the OPPWAMobile documentation; it was NOT compiled (no Xcode / OPP
// framework in the build sandbox). Copy it into the app target, build against the owner's OPPWAMobile
// version, and adjust any renamed symbols. Nothing here may log card data.
//
// Wiring:
//   let bridge = HyperPayCheckoutBridge()
//   launchers["hyperpay"] = IosLaunchersKt.hyperPayIosLauncher(bridge: bridge)
//   // In the SceneDelegate / AppDelegate URL handler (3-D Secure returns to the app):
//   //   if bridge.handleReturn(url: url) { return true }
import OPPWAMobile
import UIKit
import WabPayments  // the Kotlin framework produced by :payments

final class HyperPayCheckoutBridge: NSObject, NativeCheckoutBridge {
    private var provider: OPPCheckoutProvider?
    private var completion: ((NativeOutcome) -> Void)?
    private var returnScheme: String?

    func present(request: NativeCheckoutRequest, completion: @escaping (NativeOutcome) -> Void) {
        DispatchQueue.main.async {
            let mode: OPPProviderMode = request.environment == .prod ? .live : .test
            let paymentProvider = OPPPaymentProvider(mode: mode)
            let settings = OPPCheckoutSettings()
            settings.paymentBrands = request.brands
            settings.shopperResultURL = request.shopperResultUrl
            guard let checkout = OPPCheckoutProvider(
                paymentProvider: paymentProvider,
                checkoutID: request.checkoutId,
                settings: settings
            ) else {
                completion(IosOutcomes.shared.failed(code: "CHECKOUT_INIT", message: "The checkout could not be created"))
                return
            }
            self.provider = checkout
            self.completion = completion
            self.returnScheme = URL(string: request.shopperResultUrl)?.scheme

            checkout.presentCheckout(
                forSubmittingTransactionCompleted: { [weak self] transaction, error in
                    guard let self = self else { return }
                    if let error = error {
                        self.finish(IosOutcomes.shared.failed(code: String((error as NSError).code), message: error.localizedDescription))
                        return
                    }
                    guard let transaction = transaction else {
                        self.finish(IosOutcomes.shared.failed(code: "NO_TRANSACTION", message: "The SDK returned no transaction"))
                        return
                    }
                    switch transaction.type {
                    case .synchronous:
                        self.finish(IosOutcomes.shared.completed(resourcePath: transaction.resourcePath, redirectUrl: nil))
                    case .asynchronous:
                        // 3-D Secure: wait for the redirect back into the app (handleReturn).
                        break
                    @unknown default:
                        self.finish(IosOutcomes.shared.failed(code: "UNKNOWN_TRANSACTION_TYPE", message: nil))
                    }
                },
                cancelHandler: { [weak self] in
                    self?.finish(IosOutcomes.shared.cancelled())
                }
            )
        }
    }

    /// Call from the app's URL handler. Returns true when the URL was the payment return.
    func handleReturn(url: URL) -> Bool {
        guard let scheme = returnScheme, url.scheme == scheme, let provider = provider else { return false }
        provider.dismissCheckout(animated: true) { [weak self] in
            self?.finish(IosOutcomes.shared.completed(resourcePath: nil, redirectUrl: url.absoluteString))
        }
        return true
    }

    private func finish(_ outcome: NativeOutcome) {
        let done = completion
        completion = nil
        provider = nil
        done?(outcome)
    }
}
