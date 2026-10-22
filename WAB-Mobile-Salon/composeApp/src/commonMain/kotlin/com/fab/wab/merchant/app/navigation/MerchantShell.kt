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
import com.fab.wab.merchant.core.domain.permission.PermissionSet
import com.fab.wab.merchant.core.domain.session.LaunchRoute
import com.fab.wab.merchant.designsystem.components.dashboard.AppOfflineSalonBanner
import com.fab.wab.merchant.designsystem.components.navigation.AppNavScaffold
import com.fab.wab.merchant.designsystem.components.navigation.MerchantTab
import com.fab.wab.merchant.designsystem.components.navigation.merchantNavItems
import com.fab.wab.merchant.designsystem.components.navigation.visibleMerchantTabs

/**
 * PRD §4.3 + §8.1: the NavHost starts at the launch route; the permission-gated bottom bar / rail shows on tab
 * destinations; the offline banner (PRD §3) sits above every screen while the salon is suspended.
 */
@Composable
fun MerchantShell(
    route: LaunchRoute,
    permissions: PermissionSet,
    offline: Boolean,
    onContactWab: () -> Unit,
    navController: NavHostController,
) {
    val tabs = visibleMerchantTabs(permissions).filter { it in REGISTERED_TABS }
    val backStackEntry by navController.currentBackStackEntryAsState()
    val hierarchy = backStackEntry?.destination?.hierarchy?.map { it.route }?.toList().orEmpty()
    val currentTab = tabForRoutes(hierarchy)
    AppNavScaffold(
        items = merchantNavItems(tabs),
        selectedId = (currentTab ?: tabs.firstOrNull() ?: MerchantTab.MORE).name,
        onSelect = { id -> MerchantTab.fromId(id)?.let(navController::switchTab) },
        navigationVisible = currentTab != null && tabs.isNotEmpty(),
    ) {
        Column {
            if (offline) AppOfflineSalonBanner(onContact = onContactWab, modifier = Modifier.windowInsetsPadding(WindowInsets.statusBars))
            MainNavigation(route.startGraph(tabs), navController)
        }
    }
}
