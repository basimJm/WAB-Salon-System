package com.fab.wab.customer.core.domain.config

/** PRD §4.2: what blocks (or merely interrupts) the launch before onboarding and session checks run. */
sealed interface LaunchGate {
    /** Blocking; the user can retry (S24). */
    data class Maintenance(val message: String?) : LaunchGate

    /** Blocking; only the store opens (S24). */
    data class ForceUpdate(val storeUrl: String?) : LaunchGate

    /** Dismissible dialog, then the app continues (S24). */
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
