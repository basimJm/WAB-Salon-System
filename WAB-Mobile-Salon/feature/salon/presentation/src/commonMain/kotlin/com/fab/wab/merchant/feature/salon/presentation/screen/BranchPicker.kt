package com.fab.wab.merchant.feature.salon.presentation.screen

import androidx.compose.foundation.layout.padding
import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier
import com.fab.wab.merchant.core.domain.branch.BranchScope
import com.fab.wab.merchant.designsystem.components.branch.AppBranchSwitcher
import com.fab.wab.merchant.designsystem.theme.AppTheme

/**
 * MER-064: per-branch editors (hours, closures, services) always address one branch, so the owner's switcher has no
 * "All branches" chip and shows the edited branch (the main one until another is picked). Hidden for branch members.
 */
@Composable
internal fun BranchPicker(scope: BranchScope, onSelect: (String?) -> Unit, modifier: Modifier = Modifier) {
    if (!scope.showsSwitcher) return
    AppBranchSwitcher(
        branches = scope.branches,
        selectedId = scope.edited,
        onSelect = onSelect,
        modifier = modifier.padding(vertical = AppTheme.spacing.space8),
        allowAll = false,
    )
}
