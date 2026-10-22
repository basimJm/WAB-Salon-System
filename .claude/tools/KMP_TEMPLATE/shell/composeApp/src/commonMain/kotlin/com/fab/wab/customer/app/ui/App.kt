package com.fab.wab.customer.app.ui

import androidx.compose.foundation.isSystemInDarkTheme
import androidx.compose.runtime.Composable
import androidx.compose.runtime.CompositionLocalProvider
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.ui.platform.LocalLayoutDirection
import androidx.compose.ui.unit.LayoutDirection
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import androidx.navigation.NavHostController
import androidx.navigation.compose.rememberNavController
import com.fab.wab.customer.app.analytics.TrackNavigationScreens
import com.fab.wab.customer.app.controller.contract.MainContract.UiAction
import com.fab.wab.customer.app.controller.vm.MainViewModel
import com.fab.wab.customer.app.deeplink.DeepLinkStore
import com.fab.wab.customer.app.deeplink.deepLinkModule
import com.fab.wab.customer.app.di.analyticsAppModule
import com.fab.wab.customer.app.di.appPlatformModule
import com.fab.wab.customer.app.di.viewModelModule
import com.fab.wab.customer.app.navigation.MainNavigation
import com.fab.wab.customer.app.push.PushEffect
import com.fab.wab.customer.app.realtime.RealtimeConnectionEffect
import com.fab.wab.customer.app.resources.Res
import com.fab.wab.customer.app.resources.unauthorized_logout_message
import com.fab.wab.customer.core.analytics.AnalyticsTracker
import com.fab.wab.customer.core.analytics.compose.LocalAnalyticsTracker
import com.fab.wab.customer.core.analytics.di.analyticsModule
import com.fab.wab.customer.core.data.mock.di.mockDataModule
import com.fab.wab.customer.core.di.coreDiModule
import com.fab.wab.customer.core.domain.ThemeMode
import com.fab.wab.customer.core.domain.session.SessionStore
import com.fab.wab.customer.core.firebase.di.platformFirebaseModule
import com.fab.wab.customer.core.navigation.route.Graph
import com.fab.wab.customer.core.notification.composable.NotificationHost
import com.fab.wab.customer.core.notification.composable.rememberNotificationManager
import com.fab.wab.customer.core.notification.di.notificationModule
import com.fab.wab.customer.core.notification.model.NotificationStyle
import com.fab.wab.customer.core.realtime.RealtimeClient
import com.fab.wab.customer.core.realtime.di.realtimeModule
import com.fab.wab.customer.core.ui.utils.LocalAppLocale
import com.fab.wab.customer.core.ui.utils.LocalDarkTheme
import com.fab.wab.customer.designsystem.components.image.LocalImageLoader
import com.fab.wab.customer.designsystem.components.image.rememberImageLoader
import com.fab.wab.customer.designsystem.theme.AppTheme
import com.fab.wab.customer.feature.sample.di.sampleModule
import com.fab.wab.customer.feature.sample.presentation.di.samplePresentationModule
import org.jetbrains.compose.resources.stringResource
import org.koin.compose.koinInject
import org.koin.compose.viewmodel.koinViewModel

/** Every Koin module of the app: core first, then one pair (data + presentation) per feature. */
val appModules = listOf(
    coreDiModule,
    mockDataModule,
    realtimeModule,
    notificationModule,
    viewModelModule,
    appPlatformModule,
    deepLinkModule,
    platformFirebaseModule(),
    analyticsModule(),
    analyticsAppModule,

    // feature modules (add each new feature here, in settings.gradle.kts and in ComposeAppPlugin.FEATURE_MODULES)
    sampleModule,
    samplePresentationModule,
)

/** App shell: theme, language direction, dark mode, image loading, in-app notifications, analytics and navigation. */
@Composable
fun App(androidContext: Any?) {
    val navController: NavHostController = rememberNavController()
    val mainViewModel: MainViewModel = koinViewModel<MainViewModel>()
    val sessionTimeOut by mainViewModel.sessionTimeOutState.collectAsStateWithLifecycle()
    val language by mainViewModel.languageState.collectAsStateWithLifecycle()
    val layoutDirection = if (language.isRtl) LayoutDirection.Rtl else LayoutDirection.Ltr
    val themeMode by mainViewModel.themeMode.collectAsStateWithLifecycle()
    val systemDark = isSystemInDarkTheme()
    val isDarkTheme = when (themeMode) {
        ThemeMode.DARK -> true
        ThemeMode.LIGHT -> false
        ThemeMode.SYSTEM -> systemDark
    }
    val imageLoader = rememberImageLoader()
    val unauthorizedLogoutMessage = stringResource(Res.string.unauthorized_logout_message)

    CompositionLocalProvider(LocalLayoutDirection provides layoutDirection) {
        CompositionLocalProvider(
            LocalImageLoader provides imageLoader,
            LocalAppLocale provides language.code,
            LocalDarkTheme provides isDarkTheme,
            LocalAnalyticsTracker provides koinInject<AnalyticsTracker>(),
        ) {
            AppTheme {
                TrackNavigationScreens(navController)
                val sessionState by koinInject<SessionStore>().state.collectAsStateWithLifecycle(initialValue = null)
                RealtimeConnectionEffect(koinInject<RealtimeClient>(), isSignedIn = sessionState?.isSignedIn == true)
                NotificationHost {
                    val notificationManager = rememberNotificationManager()
                    LaunchedEffect(sessionTimeOut) {
                        if (sessionTimeOut) {
                            notificationManager.show(unauthorizedLogoutMessage, style = NotificationStyle.Error)
                            mainViewModel.onEvent(UiAction.OnSessionTimeOut)
                        }
                    }
                    PushEffect(deepLinks = koinInject<DeepLinkStore>())
                    MainNavigation(Graph.Home, navController)
                }
            }
        }
    }
}
