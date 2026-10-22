package com.fab.wab.merchant.designsystem.preview

import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.verticalScroll
import androidx.compose.runtime.Composable
import androidx.compose.runtime.CompositionLocalProvider
import androidx.compose.ui.Modifier
import androidx.compose.ui.platform.LocalLayoutDirection
import androidx.compose.ui.tooling.preview.Preview
import androidx.compose.ui.unit.LayoutDirection
import com.fab.wab.merchant.core.domain.booking.BookingStatus
import com.fab.wab.merchant.core.domain.booking.PaymentStatus
import com.fab.wab.merchant.designsystem.components.booking.AppBookingRequestSheetContent
import com.fab.wab.merchant.designsystem.components.booking.BookingRequestUi
import com.fab.wab.merchant.designsystem.components.booking.HandledBy
import com.fab.wab.merchant.designsystem.components.booking.RequestPersonUi
import com.fab.wab.merchant.designsystem.components.booking.RequestQueue
import com.fab.wab.merchant.designsystem.components.booking.RequestSheetUi
import com.fab.wab.merchant.designsystem.components.layout.AppScreen
import com.fab.wab.merchant.designsystem.theme.AppTheme
import kotlin.time.Duration.Companion.minutes

private const val QUEUE_SIZE = 3

private val BrideRequest = BookingRequestUi(
    id = "r1", reference = "WAB-24817", customerName = "سارة العلي",
    persons = listOf(
        RequestPersonUi("سارة العلي", "مكياج عروس · تسريحة عروس", "رنا", "4:00 م", isBride = true),
        RequestPersonUi("نور خليل", "قص وتسريح", "هبة", "4:00 م"),
    ),
    date = "الأربعاء 7 أكتوبر", time = "4:00 م", total = "205 د.أ", payment = PaymentStatus.DEPOSIT_PAID, age = 1.minutes,
)

@Composable
private fun RequestSheetFrame(state: RequestSheetUi, dark: Boolean, rtl: Boolean = true) {
    val direction = if (rtl) LayoutDirection.Rtl else LayoutDirection.Ltr
    CompositionLocalProvider(LocalLayoutDirection provides direction) {
        AppTheme(darkTheme = dark) {
            AppScreen {
                AppBookingRequestSheetContent(
                    state = state,
                    onAction = {},
                    modifier = Modifier.verticalScroll(rememberScrollState()).padding(AppTheme.spacing.space20),
                )
            }
        }
    }
}

@Preview(widthDp = 390, heightDp = 900)
@Composable
private fun RequestQueuedBrideLightPreview() =
    RequestSheetFrame(RequestSheetUi.Request(BrideRequest, RequestQueue.of(0, QUEUE_SIZE)), dark = false)

@Preview(widthDp = 390, heightDp = 900)
@Composable
private fun RequestHandledDarkPreview() = RequestSheetFrame(
    RequestSheetUi.Request(BrideRequest, RequestQueue.of(0, 1), handledBy = HandledBy("سارة", BookingStatus.APPROVED)),
    dark = true,
)

@Preview(widthDp = 390, heightDp = 700)
@Composable
private fun RequestAcceptedLtrPreview() =
    RequestSheetFrame(RequestSheetUi.Accepted(reference = "WAB-24817", hasNext = true), dark = false, rtl = false)
