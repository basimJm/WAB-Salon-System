package com.fab.wab.customer.app.ui

import androidx.compose.foundation.isSystemInDarkTheme
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.runtime.Composable
import androidx.compose.runtime.CompositionLocalProvider
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.ui.Modifier
import androidx.compose.ui.platform.LocalLayoutDirection
import androidx.compose.ui.unit.LayoutDirection
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import androidx.navigation.NavDestination.Companion.hasRoute
import androidx.navigation.NavDestination.Companion.hierarchy
import androidx.navigation.NavHostController
import androidx.navigation.compose.currentBackStackEntryAsState
import androidx.navigation.compose.rememberNavController
import com.fab.wab.customer.app.controller.contract.MainContract
import com.fab.wab.customer.app.controller.contract.MainContract.UiAction
import com.fab.wab.customer.app.controller.vm.MainViewModel
import com.fab.wab.customer.app.di.viewModelModule
import com.fab.wab.customer.app.navigation.MainNavigation
import com.fab.wab.customer.app.resources.Res
import com.fab.wab.customer.app.resources.unauthorized_logout_message
import com.fab.wab.customer.core.di.coreDiModule
import com.fab.wab.customer.core.domain.ThemeMode
import com.fab.wab.customer.core.navigation.route.Graph
import com.fab.wab.customer.core.notification.composable.NotificationHost
import com.fab.wab.customer.core.notification.composable.rememberNotificationManager
import com.fab.wab.customer.core.notification.di.notificationModule
import com.fab.wab.customer.core.notification.model.NotificationStyle
import com.fab.wab.customer.core.ui.mvi.CollectSideEffect
import com.fab.wab.customer.core.ui.utils.LocalAppLocale
import com.fab.wab.customer.core.ui.utils.LocalDarkTheme
import com.fab.wab.customer.designsystem.components.image.LocalImageLoader
import com.fab.wab.customer.designsystem.components.image.rememberImageLoader
import com.fab.wab.customer.designsystem.components.navigation.AppNavDestination
import com.fab.wab.customer.designsystem.components.navigation.AppNavigationRail
import com.fab.wab.customer.designsystem.resources.ic_home
import com.fab.wab.customer.designsystem.resources.nav_home
import com.fab.wab.customer.designsystem.theme.AppTheme
import com.fab.wab.customer.designsystem.theme.AppWindowWidthClass
import com.fab.wab.customer.designsystem.theme.LocalWindowWidthClass
import com.fab.wab.customer.designsystem.theme.rememberWindowWidthClass
import com.fab.wab.customer.exitApp
import com.fab.wab.customer.feature.sample.di.sampleModule
import com.fab.wab.customer.feature.sample.presentation.di.samplePresentationModule
import com.fab.wab.customer.openStoreLink
import org.jetbrains.compose.resources.stringResource
import org.koin.compose.KoinContext
import org.koin.compose.viewmodel.koinViewModel
import com.fab.wab.customer.designsystem.resources.Res as DesignSystemRes

val appModules = listOf(
    coreDiModule,
    notificationModule,
    viewModelModule,

    //feature modules
    sampleModule,
    samplePresentationModule,
)

// Add an entry per top-level graph to grow the rail / bottom bar.
private val appNavDestinations = listOf(
    AppNavDestination(
        graph = Graph.Home,
        labelRes = DesignSystemRes.string.nav_home,
        iconRes = DesignSystemRes.drawable.ic_home,
    ),
)

@Composable
fun App(androidContext: Any?) {
    // Hoist NavController so the adaptive rail and NavHost share the same instance
    val navController: NavHostController = rememberNavController()

    KoinContext {
        val mainViewModel: MainViewModel = koinViewModel<MainViewModel>()
        val state by mainViewModel.state.collectAsStateWithLifecycle()
        val sessionTimeOut by mainViewModel.sessionTimeOutState.collectAsStateWithLifecycle()

        val languageState by mainViewModel.languageState.collectAsStateWithLifecycle()
        val isRtl by remember(languageState) {
            mutableStateOf(languageState == "ar")
        }

        val layoutDirection = if (isRtl) {
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

        // Adaptive layout — determine current window width class
        val widthClass = rememberWindowWidthClass()

        // Observe back stack to drive the NavigationRail selection state
        val currentBackEntry by navController.currentBackStackEntryAsState()
        val currentGraph: Graph? = remember(currentBackEntry) {
            val hierarchy = currentBackEntry?.destination?.hierarchy
            when {
                hierarchy?.any { it.hasRoute<Graph.Home>() } == true -> Graph.Home
                else -> null
            }
        }
        val showRail = widthClass != AppWindowWidthClass.Compact

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
                    LocalAppLocale provides languageState,
                    LocalDarkTheme provides isDarkTheme,
                    LocalWindowWidthClass provides widthClass,
                ) {
                    AppTheme {
                        Row(Modifier.fillMaxSize()) {
                            if (showRail && currentGraph != null) {
                                AppNavigationRail(
                                    navController = navController,
                                    currentGraph = currentGraph,
                                    destinations = appNavDestinations,
                                )
                            }
                            Box(Modifier.weight(1f)) {
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
    }
}
