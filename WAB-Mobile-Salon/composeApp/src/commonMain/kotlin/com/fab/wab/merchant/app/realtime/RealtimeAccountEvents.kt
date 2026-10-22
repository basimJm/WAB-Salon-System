package com.fab.wab.merchant.app.realtime

import com.fab.wab.merchant.core.domain.permission.PermissionsSync
import com.fab.wab.merchant.core.domain.session.SessionStore
import com.fab.wab.merchant.core.realtime.RealtimeClient
import com.fab.wab.merchant.core.realtime.RealtimeEvents
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Job
import kotlinx.coroutines.flow.launchIn
import kotlinx.coroutines.flow.onEach

/**
 * Account events of the member room (BUSINESS_DOMAIN §7): `permissions.updated` re-fetches the permissions,
 * `access.revoked` signs out and tells the shell (PRD §4.3 "Your access was removed by the salon owner").
 */
class RealtimeAccountEvents(
    private val client: RealtimeClient,
    private val permissionsSync: PermissionsSync,
    private val sessionStore: SessionStore,
) {
    fun start(scope: CoroutineScope, onAccessRevoked: () -> Unit): Job = client.events.onEach { event ->
        when (event.name) {
            RealtimeEvents.PERMISSIONS_UPDATED -> permissionsSync.refresh()
            RealtimeEvents.ACCESS_REVOKED -> {
                sessionStore.signOut()
                onAccessRevoked()
            }
        }
    }.launchIn(scope)
}
