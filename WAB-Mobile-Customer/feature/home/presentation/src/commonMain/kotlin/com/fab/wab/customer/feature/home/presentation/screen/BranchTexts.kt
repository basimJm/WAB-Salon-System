package com.fab.wab.customer.feature.home.presentation.screen

import androidx.compose.runtime.Composable
import com.fab.wab.customer.core.domain.salon.BranchRules
import com.fab.wab.customer.core.domain.salon.SalonSummary
import com.fab.wab.customer.designsystem.resources.Res
import com.fab.wab.customer.designsystem.resources.salon_hours_separator
import com.fab.wab.customer.feature.home.presentation.resources.Res as HomeRes
import com.fab.wab.customer.feature.home.presentation.resources.home_branch_count
import org.jetbrains.compose.resources.pluralStringResource
import org.jetbrains.compose.resources.stringResource

/**
 * The place line of a salon card (BUSINESS_DOMAIN §5.17): the nearest branch's area, then "· N branches" when the
 * salon has several bookable branches. [branchesText] is null for a single-branch salon.
 */
fun salonPlaceText(locationText: String?, branchesText: String?, separator: String): String {
    val location = locationText?.trim().orEmpty()
    return when {
        branchesText == null -> location
        location.isEmpty() -> branchesText
        else -> location + separator + branchesText
    }
}

/** "3 branches" in the user's language, or null when the salon has one bookable branch. */
@Composable
fun branchCountText(branchCount: Int): String? {
    if (!BranchRules.hasSeveralBranches(branchCount)) return null
    return pluralStringResource(HomeRes.plurals.home_branch_count, branchCount, branchCount)
}

/** Card place line of [SalonSummary]: area of the nearest bookable branch + branch count. */
@Composable
fun SalonSummary.placeText(): String =
    salonPlaceText(locationText, branchCountText(shownBranchCount), stringResource(Res.string.salon_hours_separator))
