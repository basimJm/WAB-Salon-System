package com.fab.wab.customer.designsystem.components.stepper

import kotlinx.serialization.Serializable
import org.jetbrains.compose.resources.StringResource

@Serializable
data class AuditTrailStepperState(
    val currentStep: Int,
    val steps: List<AuditTrailStep>,
    val isCompleted: Boolean = false,
)

@Serializable
data class AuditTrailStep(
    val label: StringResource,
    val timestamp: String? = null,
    val isReached: Boolean = false,
    val isCurrent: Boolean = false,
)