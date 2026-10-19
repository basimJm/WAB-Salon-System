package com.fab.wab.customer.feature.home.presentation.screen

import androidx.compose.runtime.Composable
import com.fab.wab.customer.core.common.TimeFormat
import com.fab.wab.customer.core.domain.salon.SalonSummary
import com.fab.wab.customer.designsystem.components.domain.SalonCardUi
import com.fab.wab.customer.designsystem.components.domain.ServiceCardUi
import com.fab.wab.customer.designsystem.components.media.BannerUi
import com.fab.wab.customer.designsystem.resources.Res
import com.fab.wab.customer.designsystem.resources.time_am
import com.fab.wab.customer.designsystem.resources.time_pm
import com.fab.wab.customer.designsystem.resources.time_range_separator
import com.fab.wab.customer.feature.home.domain.model.HomeBanner
import com.fab.wab.customer.feature.home.domain.model.HomeService
import org.jetbrains.compose.resources.stringResource

fun HomeBanner.toUi(): BannerUi = BannerUi(id = id, imageUrl = imageUrl)

fun HomeService.toUi(): ServiceCardUi = ServiceCardUi(id = id, name = name, imageUrl = imageUrl, description = description)

/** Pure part of the card mapping; [todayHoursText] is the already formatted 12-hour range (or null). */
fun SalonSummary.toUi(todayHoursText: String?): SalonCardUi = SalonCardUi(
    id = id,
    name = name,
    imageUrl = imageUrl,
    rating = rating,
    locationText = locationText.orEmpty(),
    description = shortDescription.orEmpty(),
    isOpen = isOpenNow,
    todayHours = todayHoursText,
    isFavorite = isFavorite,
)

@Composable
fun SalonSummary.toUi(): SalonCardUi {
    val hours = todayHours?.let {
        TimeFormat.range12Hour(
            open = it.open,
            close = it.close,
            am = stringResource(Res.string.time_am),
            pm = stringResource(Res.string.time_pm),
            rangeSeparator = stringResource(Res.string.time_range_separator),
        )
    }
    return toUi(hours)
}
