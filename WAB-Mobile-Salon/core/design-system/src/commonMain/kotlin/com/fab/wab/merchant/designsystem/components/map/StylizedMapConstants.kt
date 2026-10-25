package com.fab.wab.merchant.designsystem.components.map

/** Geometry of the stylized fallback map, as drawn in design 05 Salon `on.map` (fractions of the map, degrees). */
internal object StylizedMapConstants {
    /** Horizontal roads: top fraction, rotation. */
    const val ROAD_A_TOP = 0.38f
    const val ROAD_A_ANGLE = -8f
    const val ROAD_B_TOP = 0.70f
    const val ROAD_B_ANGLE = 4f

    /** Vertical roads: start fraction, rotation. */
    const val ROAD_C_START = 0.62f
    const val ROAD_C_ANGLE = 12f
    const val ROAD_D_START = 0.22f
    const val ROAD_D_ANGLE = -6f

    /** Park block: start / top fractions and size relative to the grid cell. */
    const val PARK_START = 0.30f
    const val PARK_TOP = 0.14f
    const val PARK_WIDTH_CELLS = 2f
    const val PARK_HEIGHT_CELLS = 1.4f
    const val PARK_CORNER_CELLS = 0.3f

    /** Roads overshoot the edges so rotated ends never show. */
    const val OVERSHOOT = 0.4f
    const val BOTH_SIDES = 2f
}
