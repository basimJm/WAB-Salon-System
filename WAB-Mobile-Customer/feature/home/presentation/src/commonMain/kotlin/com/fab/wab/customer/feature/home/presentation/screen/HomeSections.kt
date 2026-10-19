package com.fab.wab.customer.feature.home.presentation.screen

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.lazy.LazyRow
import androidx.compose.foundation.lazy.items
import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier
import com.fab.wab.customer.core.domain.salon.SalonSummary
import com.fab.wab.customer.designsystem.components.domain.AppSalonCard
import com.fab.wab.customer.designsystem.components.domain.AppServiceCardCompact
import com.fab.wab.customer.designsystem.components.domain.SalonCardLayout
import com.fab.wab.customer.designsystem.components.feedback.AppStateMessage
import com.fab.wab.customer.designsystem.components.section.AppSectionHeader
import com.fab.wab.customer.designsystem.icons.AppIcons
import com.fab.wab.customer.designsystem.theme.AppTheme
import com.fab.wab.customer.feature.home.domain.model.HomeSection
import com.fab.wab.customer.feature.home.domain.model.HomeService
import com.fab.wab.customer.feature.home.presentation.controller.contract.HomeContract.NearestUi
import com.fab.wab.customer.feature.home.presentation.controller.contract.HomeContract.SalonSection
import com.fab.wab.customer.feature.home.presentation.controller.contract.HomeContract.UiAction
import com.fab.wab.customer.feature.home.presentation.resources.Res
import com.fab.wab.customer.feature.home.presentation.resources.home_enable_location
import com.fab.wab.customer.feature.home.presentation.resources.home_nearest
import com.fab.wab.customer.feature.home.presentation.resources.home_nearest_empty
import com.fab.wab.customer.feature.home.presentation.resources.home_nearest_location_off
import com.fab.wab.customer.feature.home.presentation.resources.home_recommended
import com.fab.wab.customer.feature.home.presentation.resources.home_see_all
import com.fab.wab.customer.feature.home.presentation.resources.home_see_more
import com.fab.wab.customer.feature.home.presentation.resources.home_services
import org.jetbrains.compose.resources.stringResource

@Composable
internal fun ServicesSection(section: HomeSection<HomeService>, onAction: (UiAction) -> Unit) {
    if (section.items.isEmpty()) return
    Column(verticalArrangement = Arrangement.spacedBy(AppTheme.spacing.space12)) {
        AppSectionHeader(
            title = stringResource(Res.string.home_services),
            modifier = Modifier.padding(horizontal = AppTheme.spacing.space16),
            actionText = if (section.hasMore) stringResource(Res.string.home_see_more) else null,
            onAction = { onAction(UiAction.OnServicesSeeMore) },
        )
        LazyRow(contentPadding = rowPadding(), horizontalArrangement = Arrangement.spacedBy(AppTheme.spacing.space12)) {
            items(section.items, key = { it.id }) { service ->
                AppServiceCardCompact(service = service.toUi(), onClick = { onAction(UiAction.OnServiceClick(service.id)) })
            }
        }
    }
}

@Composable
internal fun RecommendedSection(section: HomeSection<SalonSummary>, onAction: (UiAction) -> Unit) {
    if (section.items.isEmpty()) return
    Column(verticalArrangement = Arrangement.spacedBy(AppTheme.spacing.space12)) {
        AppSectionHeader(
            title = stringResource(Res.string.home_recommended),
            modifier = Modifier.padding(horizontal = AppTheme.spacing.space16),
            actionText = if (section.hasMore) stringResource(Res.string.home_see_all) else null,
            onAction = { onAction(UiAction.OnSeeAll(SalonSection.Recommended)) },
        )
        SalonRow(section.items, onAction)
    }
}

/** PRD S03 item 7: salons within the radius, empty message, or the location prompt; available to guests. */
@Composable
internal fun NearestSection(nearest: NearestUi, onAction: (UiAction) -> Unit) {
    val spacing = AppTheme.spacing
    Column(verticalArrangement = Arrangement.spacedBy(spacing.space12)) {
        AppSectionHeader(
            title = stringResource(Res.string.home_nearest),
            modifier = Modifier.padding(horizontal = spacing.space16),
            actionText = if ((nearest as? NearestUi.Salons)?.hasMore == true) stringResource(Res.string.home_see_all) else null,
            onAction = { onAction(UiAction.OnSeeAll(SalonSection.Nearest)) },
        )
        when (nearest) {
            is NearestUi.Salons -> SalonRow(nearest.items, onAction)
            NearestUi.Empty -> AppStateMessage(
                icon = AppIcons.Location,
                title = stringResource(Res.string.home_nearest_empty),
                modifier = Modifier.fillMaxWidth().padding(horizontal = spacing.space16),
            )
            NearestUi.LocationOff -> AppStateMessage(
                icon = AppIcons.LocationOff,
                title = stringResource(Res.string.home_nearest_location_off),
                modifier = Modifier.fillMaxWidth().padding(horizontal = spacing.space16),
                actionText = stringResource(Res.string.home_enable_location),
                onAction = { onAction(UiAction.OnEnableLocationClick) },
            )
        }
    }
}

@Composable
private fun SalonRow(salons: List<SalonSummary>, onAction: (UiAction) -> Unit) {
    LazyRow(contentPadding = rowPadding(), horizontalArrangement = Arrangement.spacedBy(AppTheme.spacing.space12)) {
        items(salons, key = { it.id }) { salon ->
            AppSalonCard(
                salon = salon.toUi(),
                onClick = { onAction(UiAction.OnSalonClick(salon.id)) },
                onFavoriteClick = { onAction(UiAction.OnFavoriteClick(salon.id)) },
                layout = SalonCardLayout.Horizontal,
            )
        }
    }
}

@Composable
private fun rowPadding(): PaddingValues = PaddingValues(horizontal = AppTheme.spacing.space16)
