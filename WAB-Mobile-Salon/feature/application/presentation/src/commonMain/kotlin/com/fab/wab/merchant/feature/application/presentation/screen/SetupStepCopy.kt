package com.fab.wab.merchant.feature.application.presentation.screen

import androidx.compose.ui.graphics.vector.ImageVector
import com.fab.wab.merchant.designsystem.icons.AppIcons
import com.fab.wab.merchant.feature.application.domain.model.SetupStep
import com.fab.wab.merchant.feature.application.presentation.resources.Res
import com.fab.wab.merchant.feature.application.presentation.resources.setup_gallery
import com.fab.wab.merchant.feature.application.presentation.resources.setup_gallery_sub
import com.fab.wab.merchant.feature.application.presentation.resources.setup_hours
import com.fab.wab.merchant.feature.application.presentation.resources.setup_hours_sub
import com.fab.wab.merchant.feature.application.presentation.resources.setup_location
import com.fab.wab.merchant.feature.application.presentation.resources.setup_location_sub
import com.fab.wab.merchant.feature.application.presentation.resources.setup_policies
import com.fab.wab.merchant.feature.application.presentation.resources.setup_policies_sub
import com.fab.wab.merchant.feature.application.presentation.resources.setup_profile
import com.fab.wab.merchant.feature.application.presentation.resources.setup_profile_sub
import com.fab.wab.merchant.feature.application.presentation.resources.setup_services
import com.fab.wab.merchant.feature.application.presentation.resources.setup_services_sub
import com.fab.wab.merchant.feature.application.presentation.resources.setup_staff
import com.fab.wab.merchant.feature.application.presentation.resources.setup_staff_sub
import com.fab.wab.merchant.feature.application.presentation.resources.setup_team
import com.fab.wab.merchant.feature.application.presentation.resources.setup_team_sub
import org.jetbrains.compose.resources.StringResource

internal data class StepCopy(val icon: ImageVector, val title: StringResource, val subtitle: StringResource)

internal fun stepCopy(step: SetupStep): StepCopy = when (step) {
    SetupStep.PROFILE -> StepCopy(AppIcons.Image, Res.string.setup_profile, Res.string.setup_profile_sub)
    SetupStep.LOCATION -> StepCopy(AppIcons.Location, Res.string.setup_location, Res.string.setup_location_sub)
    SetupStep.HOURS -> StepCopy(AppIcons.Clock, Res.string.setup_hours, Res.string.setup_hours_sub)
    SetupStep.SERVICES -> StepCopy(AppIcons.Tag, Res.string.setup_services, Res.string.setup_services_sub)
    SetupStep.STAFF -> StepCopy(AppIcons.Person, Res.string.setup_staff, Res.string.setup_staff_sub)
    SetupStep.POLICIES -> StepCopy(AppIcons.Shield, Res.string.setup_policies, Res.string.setup_policies_sub)
    SetupStep.GALLERY -> StepCopy(AppIcons.Gallery, Res.string.setup_gallery, Res.string.setup_gallery_sub)
    SetupStep.TEAM -> StepCopy(AppIcons.AddPerson, Res.string.setup_team, Res.string.setup_team_sub)
}
