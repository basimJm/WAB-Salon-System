package com.fab.wab.merchant.app.navigation

import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.WindowInsets
import androidx.compose.foundation.layout.statusBars
import androidx.compose.foundation.layout.windowInsetsPadding
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.ui.Modifier
import androidx.navigation.NavDestination.Companion.hierarchy
import androidx.navigation.NavHostController
import androidx.navigation.compose.currentBackStackEntryAsState
import com.fab.wab.merchant.app.deeplink.DeepLinkEffect
import com.fab.wab.merchant.app.dev.MockWorldSwitcher
import com.fab.wab.merchant.app.deeplink.DeepLinkStore
import com.fab.wab.merchant.app.permission.AlertsPermissionPrompt
import com.fab.wab.merchant.core.domain.permission.Permission
import com.fab.wab.merchant.core.domain.permission.PermissionSet
import com.fab.wab.merchant.core.domain.session.LaunchRoute
import com.fab.wab.merchant.core.navigation.route.Screen
import com.fab.wab.merchant.designsystem.components.dashboard.AppOfflineSalonBanner
import com.fab.wab.merchant.designsystem.components.navigation.AppNavScaffold
import com.fab.wab.merchant.designsystem.components.navigation.MerchantTab
import com.fab.wab.merchant.designsystem.components.navigation.merchantNavItems
import com.fab.wab.merchant.designsystem.components.navigation.visibleMerchantTabs
import com.fab.wab.merchant.feature.bookings.presentation.screen.BookingRequestHost
import org.koin.compose.koinInject

/**
 * PRD §4.3 + §8.1: the NavHost starts at the launch route; the permission-gated bottom bar / rail shows on tab
 * destinations; the offline banner (PRD §3) sits above every screen while the salon is suspended; the M10 request
 * sheet opens over any screen; opened links (`/register`, `/bookings/<id>`) are routed here.
 */
@Composable
fun MerchantShell(
    route: LaunchRoute,
    permissions: PermissionSet,
    offline: Boolean,
    onContactWab: () -> Unit,
    navController: NavHostController,
    modifier: Modifier = Modifier,
) {
    val tabs = visibleMerchantTabs(permissions).filter { it in REGISTERED_TABS }
    val backStackEntry by navController.currentBackStackEntryAsState()
    val hierarchy = backStackEntry?.destination?.hierarchy?.map { it.route }?.toList().orEmpty()
    val currentTab = tabForRoutes(hierarchy)
    val destination = backStackEntry?.destination
    val onTabRoot = destination != null && destination.parent?.startDestinationId == destination.id
    AppNavScaffold(
        items = merchantNavItems(tabs),
        selectedId = (currentTab ?: tabs.firstOrNull() ?: MerchantTab.MORE).name,
        onSelect = { id -> MerchantTab.fromId(id)?.let(navController::switchTab) },
        navigationVisible = showsNavigation(route, onTabRoot, currentTab, tabs),
        modifier = modifier,
    ) {
        Column {
            if (offline) AppOfflineSalonBanner(onContact = onContactWab, modifier = Modifier.windowInsetsPadding(WindowInsets.statusBars))
            MainNavigation(route.startGraph(tabs), navController)
        }
    }
    DeepLinkEffect(koinInject<DeepLinkStore>(), route, navController)
    MockWorldSwitcher(koinInject())
    // PRD M10 / §11: notifications (Android 13+) and the overlay explained and asked once signed in.
    if (route == LaunchRoute.HOME) AlertsPermissionPrompt(answersRequests = permissions.has(Permission.BOOKINGS_RESPOND))
    // PRD M10: the request sheet over any screen, for members who may answer requests.
    if (route == LaunchRoute.HOME && permissions.has(Permission.BOOKINGS_RESPOND)) {
        BookingRequestHost(onOpenDetails = { id -> navController.navigate(Screen.BookingDetails(id)) })
    }
}
