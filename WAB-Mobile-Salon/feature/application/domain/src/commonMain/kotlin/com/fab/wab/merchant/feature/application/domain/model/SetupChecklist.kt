package com.fab.wab.merchant.feature.application.domain.model

import com.fab.wab.merchant.core.domain.salon.CompletenessItem

/** The M06 checklist rows; required ones map onto the server's completeness items (PRD §4.2). */
enum class SetupStep(val required: Boolean, val items: Set<CompletenessItem>) {
    PROFILE(true, setOf(CompletenessItem.COVER, CompletenessItem.PROFILE_IMAGE, CompletenessItem.NAME, CompletenessItem.DESCRIPTION)),
    LOCATION(true, setOf(CompletenessItem.LOCATION, CompletenessItem.PHONE)),
    HOURS(true, setOf(CompletenessItem.WORKING_HOURS)),
    SERVICES(true, setOf(CompletenessItem.SERVICE)),
    STAFF(true, setOf(CompletenessItem.STAFF)),
    POLICIES(true, setOf(CompletenessItem.POLICY)),
    GALLERY(false, emptySet()),
    TEAM(false, emptySet()),
}

data class SetupStepStatus(val step: SetupStep, val done: Boolean)

/** Required steps are done when none of their items is missing; optional steps have no server signal (never ticked). */
fun setupChecklistOf(missing: Set<CompletenessItem>): List<SetupStepStatus> =
    SetupStep.entries.map { step -> SetupStepStatus(step, step.required && step.items.none { it in missing }) }

val List<SetupStepStatus>.requiredDone: Int get() = count { it.step.required && it.done }
val List<SetupStepStatus>.requiredTotal: Int get() = count { it.step.required }
