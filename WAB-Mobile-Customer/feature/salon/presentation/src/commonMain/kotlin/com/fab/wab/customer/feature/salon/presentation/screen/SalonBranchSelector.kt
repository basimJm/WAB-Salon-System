package com.fab.wab.customer.feature.salon.presentation.screen

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.lazy.LazyRow
import androidx.compose.foundation.lazy.items
import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier
import com.fab.wab.customer.core.domain.salon.SalonBranch
import com.fab.wab.customer.designsystem.components.chip.AppFilterChip
import com.fab.wab.customer.designsystem.components.section.AppSectionHeader
import com.fab.wab.customer.designsystem.resources.Res as CoreRes
import com.fab.wab.customer.designsystem.resources.salon_hours_separator
import com.fab.wab.customer.designsystem.theme.AppTheme
import com.fab.wab.customer.feature.salon.presentation.controller.contract.SalonDetailsContract.UiAction
import com.fab.wab.customer.feature.salon.presentation.resources.Res
import com.fab.wab.customer.feature.salon.presentation.resources.salon_branch_main
import com.fab.wab.customer.feature.salon.presentation.resources.salon_branches
import org.jetbrains.compose.resources.stringResource

/**
 * Always-visible branch selector of S07 (BUSINESS_DOMAIN §5.17), right under the header: one chip per bookable
 * branch, main first; the selected branch drives the address, maps, contacts, hours, staff and services below.
 */
@Composable
internal fun BranchSelector(
    branches: List<SalonBranch>,
    selectedBranchId: String?,
    onAction: (UiAction) -> Unit,
    modifier: Modifier = Modifier,
) {
    val spacing = AppTheme.spacing
    val mainLabel = stringResource(Res.string.salon_branch_main)
    val separator = stringResource(CoreRes.string.salon_hours_separator)
    Column(modifier) {
        AppSectionHeader(
            title = stringResource(Res.string.salon_branches),
            modifier = Modifier.padding(top = spacing.space20, bottom = spacing.space10, start = spacing.space20, end = spacing.space20),
        )
        LazyRow(
            contentPadding = PaddingValues(horizontal = spacing.space20),
            horizontalArrangement = Arrangement.spacedBy(spacing.space8),
        ) {
            items(branches, key = { it.id }, contentType = { BRANCH_TYPE }) { branch ->
                AppFilterChip(
                    text = branchChipText(branch.name, branch.isMain, mainLabel, separator),
                    selected = branch.id == selectedBranchId,
                    onClick = { onAction(UiAction.OnBranchSelect(branch.id)) },
                )
            }
        }
    }
}

/** Chip text: the branch name, with the localized "main" mark on the main branch ("Abdoun · Main"). */
fun branchChipText(name: String, isMain: Boolean, mainLabel: String, separator: String): String =
    if (isMain) name + separator + mainLabel else name

private const val BRANCH_TYPE = "branch"
