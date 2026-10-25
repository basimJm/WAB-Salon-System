package com.fab.wab.merchant.core.ui.permission

/**
 * Android "Display over other apps" (PRD M10, M25): [isSupported] is false on iOS (overlays are not allowed there);
 * the app never assumes it and only opens the system screen when the member asks.
 */
interface OverlayPermission {
    val isSupported: Boolean

    fun isGranted(): Boolean

    /** The system "Display over other apps" screen for this app. */
    fun openSettings()
}

object NoOverlayPermission : OverlayPermission {
    override val isSupported: Boolean = false
    override fun isGranted(): Boolean = false
    override fun openSettings() = Unit
}

class FakeOverlayPermission(override val isSupported: Boolean = true, var granted: Boolean = false) : OverlayPermission {
    var opened = 0
        private set
    override fun isGranted(): Boolean = granted
    override fun openSettings() {
        opened += 1
    }
}
