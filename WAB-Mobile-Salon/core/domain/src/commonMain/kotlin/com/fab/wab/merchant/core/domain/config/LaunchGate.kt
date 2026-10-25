package com.fab.wab.merchant.core.domain.config

/** PRD M01 / §4.3: what blocks (or merely interrupts) the launch before the session and salon-state routing run. */
sealed interface LaunchGate {
    /** Blocking; the user can retry (M26). */
    data class Maintenance(val message: String?) : LaunchGate

    /** Blocking; only the store opens (M26). */
    data class ForceUpdate(val storeUrl: String?) : LaunchGate

    /** Dismissible dialog, then the app continues (M26). */
    data class OptionalUpdate(val storeUrl: String?) : LaunchGate

    data object Ready : LaunchGate
}

/** Maintenance wins over the version policy: an outdated app cannot do anything while the backend is down anyway. */
fun launchGateOf(config: AppConfig): LaunchGate = when {
    config.maintenance.enabled -> LaunchGate.Maintenance(config.maintenance.message)
    config.update.status == UpdateStatus.UPDATE_REQUIRED -> LaunchGate.ForceUpdate(config.update.storeUrl)
    config.update.status == UpdateStatus.UPDATE_AVAILABLE -> LaunchGate.OptionalUpdate(config.update.storeUrl)
    else -> LaunchGate.Ready
}
