import UIKit
import FirebaseCore
import FirebaseMessaging
import UserNotifications
import ComposeApp

class AppDelegate: NSObject, UIApplicationDelegate, UNUserNotificationCenterDelegate, MessagingDelegate {

    func application(
        _ application: UIApplication,
        didFinishLaunchingWithOptions launchOptions: [UIApplication.LaunchOptionsKey: Any]? = nil
    ) -> Bool {
        let firebaseReady = FirebaseSetup.configureIfValid()
        if firebaseReady {
            FirebaseBridgeRegistration.register()
        }
        MainViewControllerKt.doInitKoin()

        if firebaseReady {
            Messaging.messaging().delegate = self
        }
        UNUserNotificationCenter.current().delegate = self
        UNUserNotificationCenter.current().requestAuthorization(options: [.alert, .badge, .sound]) { _, _ in }
        // MER-078: the APNs token is only used by Firebase Messaging, so without Firebase there is nothing to register.
        // Registration is attempted once per launch; a failure (no aps-environment on a free Personal Team) is logged
        // in didFailToRegister and never retried.
        if firebaseReady {
            application.registerForRemoteNotifications()
        }

        return true
    }

    func application(
        _ application: UIApplication,
        didRegisterForRemoteNotificationsWithDeviceToken deviceToken: Data
    ) {
        guard FirebaseApp.app() != nil else { return }
        Messaging.messaging().apnsToken = deviceToken
    }

    func application(
        _ application: UIApplication,
        didFailToRegisterForRemoteNotificationsWithError error: Error
    ) {
        NSLog("Remote notifications unavailable (no retry): %@", error.localizedDescription)
    }

    func messaging(_ messaging: Messaging, didReceiveRegistrationToken fcmToken: String?) {
        guard let token = fcmToken else { return }
        MainViewControllerKt.saveFcmToken(token: token)
        PushTokenRelay.shared.publish(token: token)
    }

    func userNotificationCenter(
        _ center: UNUserNotificationCenter,
        willPresent notification: UNNotification,
        withCompletionHandler completionHandler: @escaping (UNNotificationPresentationOptions) -> Void
    ) {
        // PRD §10.2: in the foreground the shared shell shows an in-app banner instead of the system one.
        let content = notification.request.content
        MainViewControllerKt.pushReceivedInForeground(userInfo: content.userInfo, title: content.title, body: content.body)
        completionHandler([])
    }

    func userNotificationCenter(
        _ center: UNUserNotificationCenter,
        didReceive response: UNNotificationResponse,
        withCompletionHandler completionHandler: @escaping () -> Void
    ) {
        let content = response.notification.request.content
        // PRD M10: booking requests — Accept answers in the background, Reject / tap open the booking (MER-030).
        let handled = MainViewControllerKt.notificationResponse(
            userInfo: content.userInfo,
            action: response.actionIdentifier
        ) { completionHandler() }
        if handled { return }
        MainViewControllerKt.pushTapped(userInfo: content.userInfo, title: content.title, body: content.body)
        completionHandler()
    }
}
