package com.fab.wab.merchant.feature.team.presentation.di

import com.fab.wab.merchant.core.common.BusinessTime
import com.fab.wab.merchant.core.domain.session.SessionStore
import com.fab.wab.merchant.feature.team.presentation.controller.vm.MemberEditDependencies
import com.fab.wab.merchant.feature.team.presentation.controller.vm.MemberEditViewModel
import com.fab.wab.merchant.feature.team.presentation.controller.vm.PermissionsViewModel
import com.fab.wab.merchant.feature.team.presentation.controller.vm.StaffProfileDependencies
import com.fab.wab.merchant.feature.team.presentation.controller.vm.StaffProfileViewModel
import com.fab.wab.merchant.feature.team.presentation.controller.vm.TeamDependencies
import com.fab.wab.merchant.feature.team.presentation.controller.vm.TeamViewModel
import com.fab.wab.merchant.feature.team.presentation.resources.Res
import com.fab.wab.merchant.feature.team.presentation.resources.team_unavailable_reason
import kotlinx.datetime.TimeZone
import kotlinx.datetime.toLocalDateTime
import org.jetbrains.compose.resources.getString
import org.koin.core.module.dsl.viewModel
import org.koin.dsl.module
import kotlin.time.Clock

val teamPresentationModule = module {
    viewModel {
        TeamViewModel(
            TeamDependencies(
                team = get(),
                affected = get(),
                session = get<SessionStore>().state,
                analytics = get(),
                unavailableReason = { getString(Res.string.team_unavailable_reason) },
            ),
        )
    }
    factory { MemberEditDependencies(team = get(), locations = get(), picker = get(), cropper = get(), upload = get(), analytics = get()) }
    viewModel { (memberId: String?) -> MemberEditViewModel(memberId, deps = get()) }
    factory {
        StaffProfileDependencies(
            staff = get(),
            team = get(),
            salon = get(),
            affected = get(),
            analytics = get(),
            today = { Clock.System.now().toLocalDateTime(TimeZone.of(BusinessTime.ZONE_ID)).date },
            unavailableReason = { getString(Res.string.team_unavailable_reason) },
        )
    }
    viewModel { (memberId: String) -> StaffProfileViewModel(memberId, deps = get()) }
    viewModel { (memberId: String) -> PermissionsViewModel(memberId, team = get(), analytics = get()) }
}
