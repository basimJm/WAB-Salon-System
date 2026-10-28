package com.fab.wab.customer.app.ui

import androidx.compose.foundation.isSystemInDarkTheme
import androidx.compose.runtime.Composable
import androidx.compose.runtime.CompositionLocalProvider
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.remember
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
import com.fab.wab.customer.app.analytics.ActionAnalytics
import com.fab.wab.customer.app.analytics.TrackNavigationScreens
import com.fab.wab.customer.app.deeplink.DeepLinkEffect
import com.fab.wab.customer.app.deeplink.DeepLinkStore
import com.fab.wab.customer.app.deeplink.deepLinkModule
import com.fab.wab.customer.app.di.analyticsAppModule
import com.fab.wab.customer.app.di.appPlatformModule
import com.fab.wab.customer.app.di.installationSyncModule
import com.fab.wab.customer.app.ui.system.ForceUpdateScreen
import com.fab.wab.customer.app.ui.system.MaintenanceScreen
import com.fab.wab.customer.core.domain.config.LaunchGate
import com.fab.wab.customer.designsystem.components.dialog.AppGlobalDialog
import com.fab.wab.customer.designsystem.components.dialog.GlobalDialogKind
import com.fab.wab.customer.app.di.viewModelModule
import com.fab.wab.customer.core.analytics.AnalyticsTracker
import com.fab.wab.customer.core.analytics.compose.LocalAnalyticsTracker
import com.fab.wab.customer.core.analytics.di.analyticsModule
import com.fab.wab.customer.core.firebase.di.platformFirebaseModule
import com.fab.wab.customer.app.navigation.MainNavigation
import com.fab.wab.customer.app.push.PushEffect
import com.fab.wab.customer.core.common.AppEnvironment
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
import com.fab.wab.customer.core.realtime.RealtimeClient
import com.fab.wab.customer.core.realtime.di.realtimeModule
import com.fab.wab.customer.app.realtime.RealtimeConnectionEffect
import com.fab.wab.customer.core.domain.session.SessionStore
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
import com.fab.wab.customer.feature.auth.di.authModule
import com.fab.wab.customer.feature.auth.presentation.di.authPresentationModule
import com.fab.wab.customer.feature.onboarding.di.onboardingModule
import com.fab.wab.customer.feature.onboarding.presentation.di.onboardingPresentationModule
import com.fab.wab.customer.feature.onboarding.presentation.screen.GuestProfileRoute
import com.fab.wab.customer.feature.onboarding.presentation.screen.OnboardingRoute
import com.fab.wab.customer.feature.booking.di.bookingModule
import com.fab.wab.customer.feature.booking.presentation.di.bookingPresentationModule
import com.fab.wab.customer.feature.bookings.di.bookingsModule
import com.fab.wab.customer.feature.notifications.di.notificationsModule
import com.fab.wab.customer.feature.content.di.contentModule
import com.fab.wab.customer.feature.content.presentation.di.contentPresentationModule
import com.fab.wab.customer.feature.profile.di.profileModule
import com.fab.wab.customer.feature.profile.presentation.di.profilePresentationModule
import com.fab.wab.customer.feature.notifications.presentation.di.notificationsPresentationModule
import com.fab.wab.customer.feature.bookings.presentation.di.bookingsPresentationModule
import com.fab.wab.customer.feature.favorites.di.favoritesModule
import com.fab.wab.customer.feature.favorites.presentation.di.favoritesPresentationModule
import com.fab.wab.customer.feature.home.di.homeModule
import com.fab.wab.customer.feature.home.presentation.di.homePresentationModule
import com.fab.wab.customer.feature.salon.di.salonModule
import com.fab.wab.customer.feature.salon.presentation.di.salonPresentationModule
import com.fab.wab.customer.feature.salons.di.salonsModule
import com.fab.wab.customer.feature.salons.presentation.di.salonsPresentationModule
import com.fab.wab.customer.feature.sample.di.sampleModule
import com.fab.wab.customer.feature.sample.presentation.di.samplePresentationModule
import com.fab.wab.customer.openStoreLink
import org.jetbrains.compose.resources.stringResource
import org.koin.compose.koinInject
import org.koin.compose.viewmodel.koinViewModel

val appModules = listOf(
    coreDiModule,
    mockDataModule,
    realtimeModule,
    notificationModule,
    viewModelModule,
    appPlatformModule,
    installationSyncModule,
    deepLinkModule,
    platformFirebaseModule(),
    analyticsModule(),
    analyticsAppModule,

    //feature modules
    sampleModule,
    samplePresentationModule,
    onboardingModule,
    onboardingPresentationModule,
    authModule,
    authPresentationModule,
    homeModule,
    homePresentationModule,
    salonsModule,
    salonsPresentationModule,
    salonModule,
    salonPresentationModule,
    favoritesModule,
    favoritesPresentationModule,
    bookingsModule,
    bookingsPresentationModule,
    bookingModule,
    bookingPresentationModule,
    notificationsModule,
    notificationsPresentationModule,
    profileModule,
    profilePresentationModule,
    contentModule,
    contentPresentationModule,
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
            is MainContract.SideEffect.OpenStore -> openStoreLink(it.url)
        }
    }

    // CUS-097: installed once per tracker, not as a side effect of every recomposition of the app root.
    val tracker = koinInject<AnalyticsTracker>()
    val analyticsTracker = remember(tracker) { tracker.also(ActionAnalytics::install) }

    CompositionLocalProvider(
        LocalLayoutDirection provides layoutDirection,
    ) {
        CompositionLocalProvider(
            LocalImageLoader provides imageLoader,
            LocalAppLocale provides languageState.code,
            LocalDarkTheme provides isDarkTheme,
            LocalAnalyticsTracker provides analyticsTracker,
        ) {
            when (val gate = state.gate) {
                null -> AppTheme { SplashScreen(state, mainViewModel::onEvent) }
                is LaunchGate.Maintenance ->
                    AppTheme { MaintenanceScreen(gate.message, onRetry = { mainViewModel.onEvent(UiAction.OnRetryClicked) }) }
                is LaunchGate.ForceUpdate ->
                    AppTheme { ForceUpdateScreen(onUpdate = { mainViewModel.onEvent(UiAction.OnUpdateClicked) }) }
                is LaunchGate.OptionalUpdate, LaunchGate.Ready -> AppTheme {
                    if (state.showOnboarding) {
                        OnboardingRoute(onFinish = { mainViewModel.onEvent(UiAction.OnOnboardingFinished) })
                        return@AppTheme
                    }
                    if (state.showGuestProfile) {
                        GuestProfileRoute(onSave = { mainViewModel.onEvent(UiAction.OnGuestProfileSaved) })
                        return@AppTheme
                    }
                    if (gate is LaunchGate.OptionalUpdate) {
                        AppGlobalDialog(
                            kind = GlobalDialogKind.OptionalUpdate,
                            onConfirm = { mainViewModel.onEvent(UiAction.OnUpdateClicked) },
                            onDismiss = { mainViewModel.onEvent(UiAction.OnOptionalUpdateDismissed) },
                        )
                    }
                    TrackNavigationScreens(navController)
                    DeepLinkEffect(koinInject<DeepLinkStore>(), navController)
                    val sessionState by koinInject<SessionStore>().state.collectAsStateWithLifecycle(initialValue = null)
                    RealtimeConnectionEffect(koinInject<RealtimeClient>(), isSignedIn = sessionState?.isSignedIn == true)
                    RootNavScaffold(navController) {
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

                            PushEffect(
                                navController = navController,
                                deepLinks = koinInject<DeepLinkStore>(),
                                environment = koinInject<AppEnvironment>(),
                                isSignedIn = sessionState?.isSignedIn == true,
                            )
                            MainNavigation(Graph.Home, navController)
                        }
                    }
                }
            }
        }
    }
}

/**
 * The tab scaffold of the signed-in shell. CUS-097: the back stack is read here, so a navigation recomposes only
 * this scaffold, not the whole app root with its providers and effects.
 */
@Composable
private fun RootNavScaffold(navController: NavHostController, content: @Composable () -> Unit) {
    val tabs = rootNavItems()
    val backStackEntry by navController.currentBackStackEntryAsState()
    val hierarchyRoutes = backStackEntry?.destination?.hierarchy?.map { it.route }?.toList().orEmpty()
    val currentTab = RootTab.forRoutesOrNull(hierarchyRoutes)
    AppNavScaffold(
        items = tabs,
        selectedId = (currentTab ?: RootTab.DEFAULT).id,
        onSelect = { id -> navController.switchRootTab(RootTab.fromId(id)) },
        navigationVisible = currentTab != null,
        content = content,
    )
}
