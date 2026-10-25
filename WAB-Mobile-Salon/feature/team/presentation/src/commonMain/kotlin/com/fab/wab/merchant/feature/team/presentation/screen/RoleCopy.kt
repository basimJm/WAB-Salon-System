package com.fab.wab.merchant.feature.team.presentation.screen

import com.fab.wab.merchant.core.domain.session.MemberRole
import com.fab.wab.merchant.feature.team.presentation.resources.Res
import com.fab.wab.merchant.feature.team.presentation.resources.team_employee
import com.fab.wab.merchant.feature.team.presentation.resources.team_manager
import com.fab.wab.merchant.feature.team.presentation.resources.team_owner
import org.jetbrains.compose.resources.StringResource

internal fun MemberRole.label(): StringResource = when (this) {
    MemberRole.OWNER -> Res.string.team_owner
    MemberRole.MANAGER -> Res.string.team_manager
    MemberRole.EMPLOYEE -> Res.string.team_employee
}
