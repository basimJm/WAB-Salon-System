package com.fab.wab.merchant.app.ui

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
import com.fab.wab.merchant.app.analytics.TrackNavigationScreens
import com.fab.wab.merchant.app.controller.contract.MainContract
import com.fab.wab.merchant.app.controller.contract.MainContract.UiAction
import com.fab.wab.merchant.app.controller.vm.MainViewModel
import com.fab.wab.merchant.app.deeplink.DeepLinkStore
import com.fab.wab.merchant.app.deeplink.deepLinkModule
import com.fab.wab.merchant.app.di.analyticsAppModule
import com.fab.wab.merchant.app.di.viewModelModule
import com.fab.wab.merchant.app.navigation.MainNavigation
import com.fab.wab.merchant.app.push.PushEffect
import com.fab.wab.merchant.app.realtime.RealtimeConnectionEffect
import com.fab.wab.merchant.app.resources.Res
import com.fab.wab.merchant.app.resources.access_removed_message
import com.fab.wab.merchant.app.resources.unauthorized_logout_message
import com.fab.wab.merchant.core.analytics.AnalyticsTracker
import com.fab.wab.merchant.core.analytics.compose.LocalAnalyticsTracker
import com.fab.wab.merchant.core.analytics.di.analyticsModule
import com.fab.wab.merchant.core.data.mock.di.mockDataModule
import com.fab.wab.merchant.core.di.coreDiModule
import com.fab.wab.merchant.core.domain.ThemeMode
import com.fab.wab.merchant.core.domain.permission.permissionSet
import com.fab.wab.merchant.core.domain.session.SessionState
import com.fab.wab.merchant.core.domain.session.SessionStore
import com.fab.wab.merchant.core.firebase.di.platformFirebaseModule
import com.fab.wab.merchant.core.mvi.CollectSideEffect
import com.fab.wab.merchant.core.navigation.route.Graph
import com.fab.wab.merchant.core.notification.composable.NotificationHost
import com.fab.wab.merchant.core.notification.composable.rememberNotificationManager
import com.fab.wab.merchant.core.notification.di.notificationModule
import com.fab.wab.merchant.core.notification.model.NotificationStyle
import com.fab.wab.merchant.core.realtime.RealtimeClient
import com.fab.wab.merchant.core.realtime.di.realtimeModule
import com.fab.wab.merchant.core.ui.utils.LocalAppLocale
import com.fab.wab.merchant.core.ui.utils.LocalDarkTheme
import com.fab.wab.merchant.designsystem.components.image.LocalImageLoader
import com.fab.wab.merchant.designsystem.components.image.rememberImageLoader
import com.fab.wab.merchant.designsystem.components.permission.LocalPermissions
import com.fab.wab.merchant.designsystem.theme.AppTheme
import com.fab.wab.merchant.feature.sample.di.sampleModule
import com.fab.wab.merchant.feature.sample.presentation.di.samplePresentationModule
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
fun App() {
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
                val permissions = (sessionState ?: SessionState.Guest).permissionSet()
                CompositionLocalProvider(LocalPermissions provides permissions) {
                    NotificationHost(theme = appNotificationTheme()) {
                        val notificationManager = rememberNotificationManager()
                        LaunchedEffect(sessionTimeOut) {
                            if (sessionTimeOut) {
                                notificationManager.show(unauthorizedLogoutMessage, style = NotificationStyle.Error)
                                mainViewModel.onEvent(UiAction.OnSessionTimeOut)
                            }
                        }
                        val accessRemovedMessage = stringResource(Res.string.access_removed_message)
                        CollectSideEffect(mainViewModel.sideEffect) { effect ->
                            when (effect) {
                                MainContract.SideEffect.AccessRevoked ->
                                    notificationManager.show(accessRemovedMessage, style = NotificationStyle.Error)
                            }
                        }
                        PushEffect(deepLinks = koinInject<DeepLinkStore>())
                        MainNavigation(Graph.Home, navController)
                    }
                }
            }
        }
    }
}
