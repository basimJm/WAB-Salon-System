package com.fab.wab.merchant.feature.salon.presentation.screen

import androidx.compose.ui.graphics.vector.ImageVector
import com.fab.wab.merchant.designsystem.icons.AppIcons
import com.fab.wab.merchant.feature.salon.domain.HubTile
import com.fab.wab.merchant.feature.salon.presentation.resources.Res
import com.fab.wab.merchant.feature.salon.presentation.resources.tile_branches
import com.fab.wab.merchant.feature.salon.presentation.resources.tile_branches_sub
import com.fab.wab.merchant.feature.salon.presentation.resources.tile_finance
import com.fab.wab.merchant.feature.salon.presentation.resources.tile_finance_sub
import com.fab.wab.merchant.feature.salon.presentation.resources.tile_gallery
import com.fab.wab.merchant.feature.salon.presentation.resources.tile_gallery_sub
import com.fab.wab.merchant.feature.salon.presentation.resources.tile_hours
import com.fab.wab.merchant.feature.salon.presentation.resources.tile_hours_sub
import com.fab.wab.merchant.feature.salon.presentation.resources.tile_policies
import com.fab.wab.merchant.feature.salon.presentation.resources.tile_policies_sub
import com.fab.wab.merchant.feature.salon.presentation.resources.tile_profile
import com.fab.wab.merchant.feature.salon.presentation.resources.tile_profile_sub
import com.fab.wab.merchant.feature.salon.presentation.resources.tile_reviews
import com.fab.wab.merchant.feature.salon.presentation.resources.tile_reviews_sub
import com.fab.wab.merchant.feature.salon.presentation.resources.tile_services
import com.fab.wab.merchant.feature.salon.presentation.resources.tile_services_sub
import com.fab.wab.merchant.feature.salon.presentation.resources.tile_statistics
import com.fab.wab.merchant.feature.salon.presentation.resources.tile_statistics_sub
import com.fab.wab.merchant.feature.salon.presentation.resources.tile_subscription
import com.fab.wab.merchant.feature.salon.presentation.resources.tile_subscription_sub
import com.fab.wab.merchant.feature.salon.presentation.resources.tile_team
import com.fab.wab.merchant.feature.salon.presentation.resources.tile_team_sub
import org.jetbrains.compose.resources.StringResource

internal class TileCopy(val icon: ImageVector, val title: StringResource, val subtitle: StringResource)

/** Icon and texts per tile (design 05 `TILES`). */
internal fun HubTile.copy(): TileCopy = when (this) {
    HubTile.PROFILE -> TileCopy(AppIcons.Person, Res.string.tile_profile, Res.string.tile_profile_sub)
    HubTile.GALLERY -> TileCopy(AppIcons.Gallery, Res.string.tile_gallery, Res.string.tile_gallery_sub)
    HubTile.HOURS -> TileCopy(AppIcons.Clock, Res.string.tile_hours, Res.string.tile_hours_sub)
    HubTile.SERVICES -> TileCopy(AppIcons.Tag, Res.string.tile_services, Res.string.tile_services_sub)
    HubTile.TEAM -> TileCopy(AppIcons.Companions, Res.string.tile_team, Res.string.tile_team_sub)
    HubTile.BRANCHES -> TileCopy(AppIcons.Store, Res.string.tile_branches, Res.string.tile_branches_sub)
    HubTile.POLICIES -> TileCopy(AppIcons.Shield, Res.string.tile_policies, Res.string.tile_policies_sub)
    HubTile.REVIEWS -> TileCopy(AppIcons.Star, Res.string.tile_reviews, Res.string.tile_reviews_sub)
    HubTile.STATISTICS -> TileCopy(AppIcons.EventAvailable, Res.string.tile_statistics, Res.string.tile_statistics_sub)
    HubTile.FINANCE -> TileCopy(AppIcons.Payment, Res.string.tile_finance, Res.string.tile_finance_sub)
    HubTile.SUBSCRIPTION -> TileCopy(AppIcons.Crown, Res.string.tile_subscription, Res.string.tile_subscription_sub)
}
