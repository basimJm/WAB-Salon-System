package com.fab.wab.merchant.designsystem.components.branch

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.lazy.LazyRow
import androidx.compose.foundation.lazy.items
import androidx.compose.runtime.Composable
import androidx.compose.runtime.Immutable
import androidx.compose.ui.Modifier
import androidx.compose.ui.semantics.contentDescription
import androidx.compose.ui.semantics.semantics
import com.fab.wab.merchant.core.domain.branch.Branch
import com.fab.wab.merchant.core.domain.branch.BranchStatus
import com.fab.wab.merchant.core.ui.utils.LocalAppLocale
import com.fab.wab.merchant.designsystem.components.chip.AppFilterChip
import com.fab.wab.merchant.designsystem.resources.Res
import com.fab.wab.merchant.designsystem.resources.branch_all
import com.fab.wab.merchant.designsystem.resources.branch_closed_name
import com.fab.wab.merchant.designsystem.resources.branch_switcher_label
import com.fab.wab.merchant.designsystem.theme.AppTheme
import org.jetbrains.compose.resources.stringResource

/** One choice of the switcher: a branch id and its name in the app language. */
@Immutable
data class BranchOptionUi(val id: String, val name: String, val closed: Boolean = false)

/** Switcher options from the shared branch list, in the list order (main first). */
fun branchOptions(branches: List<Branch>, language: String): List<BranchOptionUi> =
    branches.map { BranchOptionUi(it.id, it.name.localized(language), closed = it.status == BranchStatus.CLOSED) }

private const val ALL_KEY = "all"

/**
 * The owner's branch switcher (MER-062): "All branches" (when [allowAll]) then one chip per branch; the caller hides
 * it for branch members and single-branch salons (`showsBranchSwitcher`). [selectedId] null = all branches.
 */
@Composable
fun AppBranchSwitcher(
    branches: List<Branch>,
    selectedId: String?,
    onSelect: (String?) -> Unit,
    modifier: Modifier = Modifier,
    allowAll: Boolean = true,
) {
    val options = branchOptions(branches, LocalAppLocale.current)
    val spacing = AppTheme.spacing
    val label = stringResource(Res.string.branch_switcher_label)
    LazyRow(
        modifier = modifier.fillMaxWidth().semantics { contentDescription = label },
        contentPadding = PaddingValues(horizontal = spacing.space16),
        horizontalArrangement = Arrangement.spacedBy(spacing.space8),
    ) {
        if (allowAll) {
            item(key = ALL_KEY, contentType = ALL_KEY) {
                AppFilterChip(text = stringResource(Res.string.branch_all), selected = selectedId == null, onClick = { onSelect(null) })
            }
        }
        items(options, key = { it.id }, contentType = { BranchOptionUi::class }) { option ->
            AppFilterChip(
                text = if (option.closed) stringResource(Res.string.branch_closed_name, option.name) else option.name,
                selected = option.id == selectedId,
                onClick = { onSelect(option.id) },
            )
        }
    }
}
