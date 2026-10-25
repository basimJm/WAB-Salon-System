package com.fab.wab.merchant.feature.team.presentation.controller.contract

import com.fab.wab.merchant.core.domain.permission.Permission
import com.fab.wab.merchant.feature.team.domain.TeamMember

sealed interface PermissionsContract {
    data class UiState(
        val loading: Boolean = true,
        val error: String? = null,
        val member: TeamMember? = null,
        val original: Set<Permission> = emptySet(),
        val selected: Set<Permission> = emptySet(),
        val saving: Boolean = false,
    ) {
        val canSave: Boolean get() = selected != original && !saving
    }

    sealed interface UiAction {
        data class OnToggle(val permission: Permission) : UiAction
        data object OnApplyTemplate : UiAction
        data object OnSave : UiAction
        data object OnRetry : UiAction
    }

    sealed interface SideEffect {
        data object Saved : SideEffect
        data class ShowError(val message: String) : SideEffect
    }
}
