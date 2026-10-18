package com.fab.wab.customer.core.domain.salon

/** Today's opening window as the server sends it: "HH:mm" in Asia/Amman (BUSINESS_DOMAIN schedules). */
data class OpeningHours(val open: String, val close: String)

/** Salon card facts shared by Home, lists, search and favorites (PRD 8.0 shared card). */
data class SalonSummary(
    val id: String,
    val name: String,
    val imageUrl: String?,
    val rating: Float,
    val reviewsCount: Int,
    val locationText: String?,
    val shortDescription: String?,
    val isOpenNow: Boolean,
    val todayHours: OpeningHours?,
    val isFavorite: Boolean,
    val distanceKm: Double?,
)
