package com.fab.wab.merchant.feature.finance.presentation.screen

import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp

/** Design 08 `on.finance` values without a design-system token. */
internal object FinanceDesign {
    // Payout card: gradient, `padding:18px;border-radius:22px`, caption 12.5 at 90 %, amount 30/700 `margin:2px 0 12px`
    val cardPadding = 18.dp
    val amountSize = 30.sp
    val captionSize = 12.5.sp
    val amountBottom = 12.dp
    const val SOFT_TEXT_ALPHA = 0.9f
    const val DIVIDER_ALPHA = 0.25f

    // Info: `padding:10px 12px;border-radius:12px;background:var(--surface)`, 11.5
    val infoShape = RoundedCornerShape(12.dp)
    val infoPaddingV = 10.dp
    val infoPaddingH = 12.dp
    val infoSize = 11.5.sp
}
