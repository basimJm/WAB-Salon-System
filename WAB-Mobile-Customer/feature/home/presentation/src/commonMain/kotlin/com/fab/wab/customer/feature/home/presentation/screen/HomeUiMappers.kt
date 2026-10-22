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
import kotlin.math.roundToInt

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
fun SalonSummary.toUi(): SalonCardUi = toUi(todayHoursText())

/** Today's window as 12-hour text in the user's language, or null when the salon has no hours today. */
@Composable
fun SalonSummary.todayHoursText(): String? = todayHours?.let {
    TimeFormat.range12Hour(
        open = it.open,
        close = it.close,
        am = stringResource(Res.string.time_am),
        pm = stringResource(Res.string.time_pm),
        rangeSeparator = stringResource(Res.string.time_range_separator),
    )
}

/** Distance as the design shows it: one decimal ("0.8", "2.4"), never negative; whole numbers keep the ".0". */
fun distanceText(km: Double): String {
    val tenths = (km.coerceAtLeast(0.0) * DISTANCE_TENTHS).roundToInt()
    return "${tenths / DISTANCE_TENTHS}.${tenths % DISTANCE_TENTHS}"
}

private const val DISTANCE_TENTHS = 10
