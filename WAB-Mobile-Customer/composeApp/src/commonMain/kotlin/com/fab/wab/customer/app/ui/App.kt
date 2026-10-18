package com.fab.wab.customer.app.ui

import androidx.compose.foundation.isSystemInDarkTheme
import androidx.compose.runtime.Composable
import androidx.compose.runtime.CompositionLocalProvider
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.ui.platform.LocalLayoutDirection
import androidx.compose.ui.unit.LayoutDirection
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import androidx.navigation.NavDestination.Companion.hierarchy
import androidx.navigation.NavHostController
import androidx.navigation.compose.currentBackStackEntryAsState
import androidx.navigation.compose.rememberNavController
import com.fab.wab.customer.app.controller.contract.MainContract
import com.fab.wab.customer.app.controller.contract.MainContract.UiAction
import com.fab.wab.customer.app.controller.vm.MainViewModel
import com.fab.wab.customer.app.analytics.TrackNavigationScreens
import com.fab.wab.customer.app.di.analyticsAppModule
import com.fab.wab.customer.app.di.viewModelModule
import com.fab.wab.customer.core.analytics.AnalyticsTracker
import com.fab.wab.customer.core.analytics.compose.LocalAnalyticsTracker
import com.fab.wab.customer.core.analytics.di.analyticsModule
import com.fab.wab.customer.core.firebase.di.platformFirebaseModule
import com.fab.wab.customer.app.navigation.MainNavigation
import com.fab.wab.customer.app.navigation.RootTab
import com.fab.wab.customer.app.navigation.rootNavItems
import com.fab.wab.customer.app.navigation.switchRootTab
import com.fab.wab.customer.app.resources.Res
import com.fab.wab.customer.app.resources.unauthorized_logout_message
import com.fab.wab.customer.core.data.mock.di.mockDataModule
import com.fab.wab.customer.core.di.coreDiModule
import com.fab.wab.customer.core.domain.ThemeMode
import com.fab.wab.customer.core.navigation.route.Graph
import com.fab.wab.customer.core.notification.composable.NotificationHost
import com.fab.wab.customer.core.notification.composable.rememberNotificationManager
import com.fab.wab.customer.core.notification.di.notificationModule
import com.fab.wab.customer.core.notification.model.NotificationStyle
import com.fab.wab.customer.core.mvi.CollectSideEffect
import com.fab.wab.customer.core.ui.utils.LocalAppLocale
import com.fab.wab.customer.core.ui.utils.LocalDarkTheme
import com.fab.wab.customer.designsystem.components.image.LocalImageLoader
import com.fab.wab.customer.designsystem.components.image.rememberImageLoader
import com.fab.wab.customer.designsystem.components.navigation.AppNavScaffold
import com.fab.wab.customer.designsystem.theme.AppTheme
import com.fab.wab.customer.exitApp
import com.fab.wab.customer.feature.sample.di.sampleModule
import com.fab.wab.customer.feature.sample.presentation.di.samplePresentationModule
import com.fab.wab.customer.openStoreLink
import org.jetbrains.compose.resources.stringResource
import org.koin.compose.koinInject
import org.koin.compose.viewmodel.koinViewModel

val appModules = listOf(
    coreDiModule,
    mockDataModule,
    notificationModule,
    viewModelModule,
    platformFirebaseModule(),
    analyticsModule(),
    analyticsAppModule,

    //feature modules
    sampleModule,
    samplePresentationModule,
)

@Composable
fun App(androidContext: Any?) {
    // Hoist NavController so the adaptive rail and NavHost share the same instance
    val navController: NavHostController = rememberNavController()

    val mainViewModel: MainViewModel = koinViewModel<MainViewModel>()
    val state by mainViewModel.state.collectAsStateWithLifecycle()
    val sessionTimeOut by mainViewModel.sessionTimeOutState.collectAsStateWithLifecycle()

    val languageState by mainViewModel.languageState.collectAsStateWithLifecycle()
    val layoutDirection = if (languageState.isRtl) {
        LayoutDirection.Rtl
    } else {
        LayoutDirection.Ltr
    }

    val themeMode by mainViewModel.themeMode.collectAsStateWithLifecycle()
    val systemDark = isSystemInDarkTheme()
    val isDarkTheme = when (themeMode) {
        ThemeMode.DARK -> true
        ThemeMode.LIGHT -> false
        ThemeMode.SYSTEM -> systemDark
    }
    val imageLoader = rememberImageLoader()
    val unauthorizedLogoutMessage = stringResource(Res.string.unauthorized_logout_message)

    CollectSideEffect(mainViewModel.sideEffect) {
        when (it) {
            MainContract.SideEffect.KillTheApp -> exitApp()
            MainContract.SideEffect.NavigateToStore -> openStoreLink()
        }
    }

    if (state.splashScreenState.showSplashScreen) {
        SplashScreen(state.splashScreenState, mainViewModel::onEvent)
    } else {
        CompositionLocalProvider(
            LocalLayoutDirection provides layoutDirection,
        ) {
            CompositionLocalProvider(
                LocalImageLoader provides imageLoader,
                LocalAppLocale provides languageState.code,
                LocalDarkTheme provides isDarkTheme,
                LocalAnalyticsTracker provides koinInject<AnalyticsTracker>(),
            ) {
                AppTheme {
                    TrackNavigationScreens(navController)
                    val tabs = rootNavItems()
                    val backStackEntry by navController.currentBackStackEntryAsState()
                    val hierarchyRoutes = backStackEntry?.destination?.hierarchy?.map { it.route }?.toList().orEmpty()
                    val selectedTab = RootTab.forRoutes(hierarchyRoutes)
                    AppNavScaffold(
                        items = tabs,
                        selectedId = selectedTab.id,
                        onSelect = { id -> navController.switchRootTab(RootTab.fromId(id)) },
                    ) {
                        NotificationHost {
                            val notificationManager = rememberNotificationManager()

                            LaunchedEffect(sessionTimeOut) {
                                sessionTimeOut
                                    .takeIf { it }
                                    ?.let {
                                        notificationManager.show(
                                            unauthorizedLogoutMessage,
                                            style = NotificationStyle.Error,
                                        )
                                        mainViewModel.onEvent(UiAction.OnSessionTimeOut)
                                        navController.navigate(Graph.Home) {
                                            popUpTo(navController.graph.id) {
                                                inclusive = true
                                            }
                                            launchSingleTop = true
                                        }
                                    }
                            }

                            MainNavigation(Graph.Home, navController)
                        }
                    }
                }
            }
        }
    }
}
