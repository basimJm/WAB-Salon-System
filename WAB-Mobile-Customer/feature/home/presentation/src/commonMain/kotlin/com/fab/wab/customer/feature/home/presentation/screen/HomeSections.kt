package com.fab.wab.customer.feature.home.presentation.screen

import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.layout.widthIn
import androidx.compose.foundation.lazy.LazyRow
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.Icon
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.draw.drawWithCache
import androidx.compose.ui.geometry.CornerRadius
import androidx.compose.ui.graphics.PathEffect
import androidx.compose.ui.graphics.drawscope.Stroke
import androidx.compose.ui.semantics.Role
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.Dp
import com.fab.wab.customer.core.domain.salon.SalonSummary
import com.fab.wab.customer.designsystem.components.text.AppText
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

/** Design S03 services row: 136 dp tiles with a 96 dp image, 13.5 sp name and a two-line 11.5 sp description. */
@Composable
internal fun ServicesSection(section: HomeSection<HomeService>, onAction: (UiAction) -> Unit) {
    if (section.items.isEmpty()) return
    Column(Modifier.fillMaxWidth()) {
        SectionTitle(
            title = stringResource(Res.string.home_services),
            topMargin = DiscoveryDesign.SECTION_TOP_FIRST,
            actionText = if (section.hasMore) stringResource(Res.string.home_see_more) else null,
            onAction = { onAction(UiAction.OnServicesSeeMore) },
        )
        LazyRow(
            contentPadding = PaddingValues(
                start = AppTheme.spacing.space20,
                end = AppTheme.spacing.space20,
                bottom = AppTheme.spacing.space4,
            ),
            horizontalArrangement = Arrangement.spacedBy(AppTheme.spacing.space12),
        ) {
            items(section.items, key = { it.id }, contentType = { SERVICE_TYPE }) { service ->
                ServiceTile(service, onClick = { onAction(UiAction.OnServiceClick(service.id)) })
            }
        }
    }
}

@Composable
private fun ServiceTile(service: HomeService, onClick: () -> Unit) {
    val colors = AppTheme.colors
    Column(modifier = Modifier.width(DiscoveryDesign.SERVICE_TILE_WIDTH).clickable(role = Role.Button, onClick = onClick)) {
        SalonImage(
            service.imageUrl,
            Modifier
                .fillMaxWidth()
                .height(DiscoveryDesign.SERVICE_IMAGE_HEIGHT)
                .clip(RoundedCornerShape(DiscoveryDesign.SERVICE_IMAGE_RADIUS)),
        )
        AppText(
            text = service.name,
            style = discoveryBody(DiscoveryDesign.TEXT_13_5, FontWeight.SemiBold),
            maxLines = 1,
            modifier = Modifier.padding(top = AppTheme.spacing.space8, bottom = AppTheme.spacing.space2),
        )
        AppText(
            text = service.description,
            style = discoveryBody(DiscoveryDesign.TEXT_11_5, lineHeight = DiscoveryDesign.LINE_HEIGHT_1_5),
            color = colors.muted,
            maxLines = DiscoveryDesign.SERVICE_DESC_LINES,
        )
    }
}

@Composable
internal fun RecommendedSection(section: HomeSection<SalonSummary>, onAction: (UiAction) -> Unit) {
    if (section.items.isEmpty()) return
    Column(Modifier.fillMaxWidth()) {
        SectionTitle(
            title = stringResource(Res.string.home_recommended),
            topMargin = DiscoveryDesign.SECTION_TOP,
            actionText = if (section.hasMore) stringResource(Res.string.home_see_all) else null,
            onAction = { onAction(UiAction.OnSeeAll(SalonSection.Recommended)) },
        )
        SalonRow(section.items, onAction, showDistance = false)
    }
}

/** PRD S03 item 7 / design `nearOn | nearOff | nearEmpty`; available to guests. */
@Composable
internal fun NearestSection(nearest: NearestUi, onAction: (UiAction) -> Unit) {
    val spacing = AppTheme.spacing
    SectionTitle(
        title = stringResource(Res.string.home_nearest),
        topMargin = DiscoveryDesign.SECTION_TOP,
        actionText = if ((nearest as? NearestUi.Salons)?.hasMore == true) stringResource(Res.string.home_see_all) else null,
        onAction = { onAction(UiAction.OnSeeAll(SalonSection.Nearest)) },
    )
    when (nearest) {
        is NearestUi.Salons -> SalonRow(nearest.items, onAction, showDistance = true)
        NearestUi.Empty -> NearestEmpty(Modifier.padding(horizontal = spacing.space20))
        NearestUi.LocationOff -> NearestLocationOff(
            onEnable = { onAction(UiAction.OnEnableLocationClick) },
            Modifier.padding(horizontal = spacing.space20),
        )
    }
}

@Composable
private fun SectionTitle(title: String, topMargin: Dp, actionText: String?, onAction: () -> Unit) {
    DiscoverySectionTitle(
        title = title,
        actionText = actionText,
        onAction = onAction,
        modifier = Modifier.padding(
            start = AppTheme.spacing.space20,
            end = AppTheme.spacing.space20,
            top = topMargin,
            bottom = AppTheme.spacing.space12,
        ),
    )
}

@Composable
private fun SalonRow(salons: List<SalonSummary>, onAction: (UiAction) -> Unit, showDistance: Boolean) {
    LazyRow(
        contentPadding = PaddingValues(start = AppTheme.spacing.space20, end = AppTheme.spacing.space20, bottom = AppTheme.spacing.space6),
        horizontalArrangement = Arrangement.spacedBy(AppTheme.spacing.space12),
    ) {
        items(salons, key = { it.entryKey }, contentType = { SALON_TYPE }) { salon ->
            DiscoverySalonCard(
                salon = salon,
                onClick = { onAction(UiAction.OnSalonClick(salon.id, salon.preselectedBranchId)) },
                onFavoriteClick = { onAction(UiAction.OnFavoriteClick(salon.id)) },
                showDistance = showDistance,
            )
        }
    }
}

/** Dashed surface panel: 54 dp soft pin circle, 13.5 sp muted message (max 260 dp), 44 dp gradient button. */
@Composable
private fun NearestLocationOff(onEnable: () -> Unit, modifier: Modifier = Modifier) {
    val colors = AppTheme.colors
    val shape = RoundedCornerShape(DiscoveryDesign.SALON_CARD_RADIUS)
    val line = colors.line
    val hairline = AppTheme.sizes.hairline
    Column(
        modifier = modifier
            .fillMaxWidth()
            .clip(shape)
            .background(colors.surface)
            .drawWithCache {
                // CUS-097: stroke and dash effect built once per size; the scrolled feed redraws this on every frame.
                val stroke = Stroke(
                    hairline.toPx(),
                    pathEffect = PathEffect.dashPathEffect(floatArrayOf(DiscoveryDesign.DASH_LENGTH, DiscoveryDesign.DASH_GAP)),
                )
                val corner = CornerRadius(DiscoveryDesign.SALON_CARD_RADIUS.toPx())
                onDrawBehind { drawRoundRect(color = line, cornerRadius = corner, style = stroke) }
            }
            .padding(horizontal = AppTheme.spacing.space20, vertical = DiscoveryDesign.NEAR_OFF_PADDING_V),
        horizontalAlignment = Alignment.CenterHorizontally,
        verticalArrangement = Arrangement.spacedBy(AppTheme.spacing.space10),
    ) {
        Box(
            Modifier.size(DiscoveryDesign.NEAR_OFF_ICON_CIRCLE).background(colors.soft, AppTheme.shapes.circle),
            contentAlignment = Alignment.Center,
        ) {
            Icon(AppIcons.Location, contentDescription = null, tint = colors.accent, modifier = Modifier.size(AppTheme.sizes.iconLarge))
        }
        AppText(
            text = stringResource(Res.string.home_nearest_location_off),
            style = discoveryBody(DiscoveryDesign.TEXT_13_5, lineHeight = DiscoveryDesign.LINE_HEIGHT_1_6),
            color = colors.muted,
            textAlign = TextAlign.Center,
            modifier = Modifier.widthIn(max = DiscoveryDesign.NEAR_OFF_TEXT_MAX_WIDTH),
        )
        DiscoveryGradientButton(
            text = stringResource(Res.string.home_enable_location),
            onClick = onEnable,
            height = DiscoveryDesign.NEAR_OFF_BUTTON_HEIGHT,
            paddingHorizontal = DiscoveryDesign.NEAR_OFF_BUTTON_PADDING_H,
            radius = DiscoveryDesign.NEAR_OFF_BUTTON_RADIUS,
            textStyle = discoveryBody(DiscoveryDesign.TEXT_13_5, FontWeight.SemiBold),
        )
    }
}

@Composable
private fun NearestEmpty(modifier: Modifier = Modifier) {
    AppText(
        text = stringResource(Res.string.home_nearest_empty),
        style = discoveryBody(DiscoveryDesign.TEXT_13_5, lineHeight = DiscoveryDesign.LINE_HEIGHT_1_6),
        color = AppTheme.colors.muted,
        textAlign = TextAlign.Center,
        modifier = modifier
            .fillMaxWidth()
            .background(AppTheme.colors.surface, RoundedCornerShape(DiscoveryDesign.SALON_CARD_RADIUS))
            .padding(horizontal = AppTheme.spacing.space20, vertical = AppTheme.spacing.space24),
    )
}

private const val SERVICE_TYPE = "service"
private const val SALON_TYPE = "salon"
