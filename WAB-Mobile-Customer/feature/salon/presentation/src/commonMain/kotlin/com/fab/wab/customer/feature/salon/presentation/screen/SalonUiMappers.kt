@file:Suppress("DEPRECATION") // kotlinx-datetime 0.7 deprecations on the K/N classpath until the datetime upgrade

package com.fab.wab.customer.feature.salon.presentation.screen

import androidx.compose.runtime.Composable
import com.fab.wab.customer.core.common.BusinessTime
import com.fab.wab.customer.core.common.TimeFormat
import com.fab.wab.customer.core.domain.salon.DayOfWeek
import kotlinx.datetime.DayOfWeek as IsoDayOfWeek
import com.fab.wab.customer.core.domain.salon.GalleryItem
import com.fab.wab.customer.core.domain.salon.MediaType
import com.fab.wab.customer.core.domain.salon.OpeningHours
import com.fab.wab.customer.core.domain.salon.Review
import com.fab.wab.customer.core.domain.salon.SalonService
import com.fab.wab.customer.core.domain.salon.StaffPreview
import com.fab.wab.customer.core.domain.salon.StaffStatus
import com.fab.wab.customer.designsystem.components.domain.ReviewUi
import com.fab.wab.customer.designsystem.components.domain.ServiceCardUi
import com.fab.wab.customer.designsystem.components.domain.StaffItemUi
import com.fab.wab.customer.designsystem.components.media.MediaItemUi
import com.fab.wab.customer.designsystem.components.media.MediaKind
import com.fab.wab.customer.designsystem.resources.Res as CoreRes
import com.fab.wab.customer.designsystem.resources.price_jod
import com.fab.wab.customer.designsystem.resources.time_am
import com.fab.wab.customer.designsystem.resources.time_pm
import com.fab.wab.customer.designsystem.resources.time_range_separator
import com.fab.wab.customer.feature.salon.presentation.resources.Res
import com.fab.wab.customer.feature.salon.presentation.resources.day_fri
import com.fab.wab.customer.feature.salon.presentation.resources.day_mon
import com.fab.wab.customer.feature.salon.presentation.resources.day_sat
import com.fab.wab.customer.feature.salon.presentation.resources.day_sun
import com.fab.wab.customer.feature.salon.presentation.resources.day_thu
import com.fab.wab.customer.feature.salon.presentation.resources.day_tue
import com.fab.wab.customer.feature.salon.presentation.resources.day_wed
import kotlinx.datetime.Instant
import kotlinx.datetime.TimeZone
import kotlinx.datetime.toLocalDateTime
import org.jetbrains.compose.resources.StringResource
import org.jetbrains.compose.resources.stringResource

@Composable
fun OpeningHours.text(): String? = TimeFormat.range12Hour(
    open = open,
    close = close,
    am = stringResource(CoreRes.string.time_am),
    pm = stringResource(CoreRes.string.time_pm),
    rangeSeparator = stringResource(CoreRes.string.time_range_separator),
)

fun DayOfWeek.nameRes(): StringResource = when (this) {
    DayOfWeek.SAT -> Res.string.day_sat
    DayOfWeek.SUN -> Res.string.day_sun
    DayOfWeek.MON -> Res.string.day_mon
    DayOfWeek.TUE -> Res.string.day_tue
    DayOfWeek.WED -> Res.string.day_wed
    DayOfWeek.THU -> Res.string.day_thu
    DayOfWeek.FRI -> Res.string.day_fri
}

fun StaffPreview.toUi(): StaffItemUi =
    StaffItemUi(id = id, name = firstName, imageUrl = photoUrl, onDutyToday = status == StaffStatus.ON_DUTY)

@Composable
fun SalonService.toUi(): ServiceCardUi = ServiceCardUi(
    id = id,
    name = name,
    imageUrl = imageUrl,
    description = description.orEmpty(),
    durationMinutes = durationMinutes,
    priceText = stringResource(CoreRes.string.price_jod, price),
)

fun GalleryItem.toUi(): MediaItemUi = MediaItemUi(
    id = id,
    url = url,
    kind = if (type == MediaType.VIDEO) MediaKind.Video else MediaKind.Image,
    thumbnailUrl = thumbnailUrl,
)

fun Review.toUi(): ReviewUi = ReviewUi(
    id = id,
    authorName = customerName,
    rating = rating,
    comment = comment.orEmpty(),
    dateText = TimeFormat.isoDateText(createdAt) ?: createdAt,
)

/** The business day in Asia/Amman for [now] (S07 hours card highlights today). Pure and tested. */
fun todayDayOfWeek(now: Instant = BusinessTime.nowInstant(), zoneId: String = BusinessTime.ZONE_ID): DayOfWeek =
    when (now.toLocalDateTime(TimeZone.of(zoneId)).dayOfWeek) {
        IsoDayOfWeek.SATURDAY -> DayOfWeek.SAT
        IsoDayOfWeek.SUNDAY -> DayOfWeek.SUN
        IsoDayOfWeek.MONDAY -> DayOfWeek.MON
        IsoDayOfWeek.TUESDAY -> DayOfWeek.TUE
        IsoDayOfWeek.WEDNESDAY -> DayOfWeek.WED
        IsoDayOfWeek.THURSDAY -> DayOfWeek.THU
        IsoDayOfWeek.FRIDAY -> DayOfWeek.FRI
    }
