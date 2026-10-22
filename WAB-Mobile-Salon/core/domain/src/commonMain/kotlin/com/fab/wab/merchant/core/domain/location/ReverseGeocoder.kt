package com.fab.wab.merchant.core.domain.location

import com.fab.wab.merchant.core.domain.model.LocationData
import kotlin.math.abs

/** Address text for a map point in the app language (PRD M13 map picker); null when nothing is known there. */
fun interface ReverseGeocoder {
    suspend fun addressOf(point: LocationData, language: String): String?
}

/** Map picker defaults: Amman city centre until the salon or the device gives a better point. */
object MapDefaults {
    const val DEFAULT_LATITUDE = 31.9539
    const val DEFAULT_LONGITUDE = 35.9106
    const val DEFAULT_ZOOM = 16f

    /** Moves smaller than this (degrees, about one metre) are the same point: no re-geocoding, no camera jump. */
    const val SAME_POINT_DEGREES = 0.00001

    const val ADDRESS_SEPARATOR = "، "
    const val ADDRESS_SEPARATOR_LTR = ", "

    val DEFAULT_CENTER = LocationData(DEFAULT_LATITUDE, DEFAULT_LONGITUDE)
}

fun LocationData.isSamePointAs(other: LocationData): Boolean =
    abs(latitude - other.latitude) < MapDefaults.SAME_POINT_DEGREES && abs(longitude - other.longitude) < MapDefaults.SAME_POINT_DEGREES

/** Joins the non-blank, distinct address parts (street, area, city) with the language's comma. */
fun addressLineOf(parts: List<String?>, rtl: Boolean): String? {
    val clean = parts.mapNotNull { it?.trim()?.takeIf(String::isNotEmpty) }.distinct()
    if (clean.isEmpty()) return null
    return clean.joinToString(if (rtl) MapDefaults.ADDRESS_SEPARATOR else MapDefaults.ADDRESS_SEPARATOR_LTR)
}
