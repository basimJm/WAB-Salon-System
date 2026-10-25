package com.fab.wab.customer.app.deeplink

import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import androidx.navigation.NavHostController
import com.fab.wab.customer.app.navigation.RootTab
import com.fab.wab.customer.app.navigation.switchRootTab
import com.fab.wab.customer.core.common.DeepLink
import com.fab.wab.customer.core.navigation.route.Screen

/** Runs only while the NavHost is composed, so onboarding and S02 always finish first (PRD §4.4 step 1). */
@Composable
fun DeepLinkEffect(store: DeepLinkStore, navController: NavHostController) {
    val link by store.link.collectAsStateWithLifecycle()
    LaunchedEffect(link) {
        val current = link ?: return@LaunchedEffect
        store.consume(current)
        navController.switchRootTab(RootTab.Home)
        when (current) {
            is DeepLink.Salon -> navController.navigate(Screen.SalonDetails(current.salonId, current.branchId))
        }
    }
}
