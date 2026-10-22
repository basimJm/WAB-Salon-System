import SwiftUI
import ComposeApp

@main
struct iOSApp: App {
    @UIApplicationDelegateAdaptor(AppDelegate.self) var appDelegate
    var body: some Scene {
        WindowGroup {
            ContentView()
                // Universal Links (PRD §4.4): the shared shell routes the link after onboarding / S02.
                .onOpenURL { url in
                    // Firebase Phone Auth (reCAPTCHA fallback) first, then app deep links.
                    if FirebaseSetup.handleAuthURL(url) { return }
                    MainViewControllerKt.handleDeepLink(url: url.absoluteString)
                }
                .onContinueUserActivity(NSUserActivityTypeBrowsingWeb) { activity in
                    if let url = activity.webpageURL {
                        MainViewControllerKt.handleDeepLink(url: url.absoluteString)
                    }
                }
        }
    }
}
