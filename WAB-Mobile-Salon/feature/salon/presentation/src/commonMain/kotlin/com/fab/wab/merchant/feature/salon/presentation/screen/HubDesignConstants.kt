package com.fab.wab.merchant.feature.salon.presentation.screen

import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp

/** Design 05 Salon `on.hub` values without a design-system token. */
internal object HubDesign {
    /** `grid-template-columns:1fr 1fr` on a phone; wider windows double the adaptive grid. */
    const val COLUMNS_PER_GRID_COLUMN = 2

    // Salon card: `padding:12px;border-radius:20px`, name 15.5/700
    val headerShape = RoundedCornerShape(20.dp)
    val headerPadding = 12.dp
    val salonNameSize = 15.5.sp

    // Tile: `padding:14px;border-radius:18px`, icon box 40 / radius 12 / icon 20, title 14/700 `margin-top:10px`, sub 11.5
    val tileShape = RoundedCornerShape(18.dp)
    val tilePadding = 14.dp
    val iconBox = 40.dp
    val iconBoxShape = RoundedCornerShape(12.dp)
    val icon = 20.dp
    val titleTop = 10.dp
    val titleSize = 14.sp
    val subtitleSize = 11.5.sp
}
