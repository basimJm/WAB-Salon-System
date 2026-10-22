package com.fab.wab.customer.core.navigation.route

/** Preselected filter of S04 when opened from a Home "See all" (PRD S03 items 6–7); carried as a route code. */
enum class SalonListFilter(val code: String) {
    RECOMMENDED("recommended"),
    NEAREST("nearest"),
    ;

    companion object {
        fun fromCode(code: String?): SalonListFilter? = entries.firstOrNull { it.code == code }
    }
}
