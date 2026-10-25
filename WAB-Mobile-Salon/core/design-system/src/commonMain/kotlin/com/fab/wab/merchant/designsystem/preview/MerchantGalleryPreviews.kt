package com.fab.wab.merchant.designsystem.preview

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
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
import com.fab.wab.merchant.core.domain.booking.RefundStatus
import com.fab.wab.merchant.core.domain.session.SalonState
import com.fab.wab.merchant.designsystem.components.booking.AppBookingCard
import com.fab.wab.merchant.designsystem.components.booking.AppStatusTimeline
import com.fab.wab.merchant.designsystem.components.booking.BookingCardUi
import com.fab.wab.merchant.designsystem.components.booking.StatusHistoryEntryUi
import com.fab.wab.merchant.designsystem.components.dashboard.AppKpiTile
import com.fab.wab.merchant.designsystem.components.dashboard.AppNextBookingTile
import com.fab.wab.merchant.designsystem.components.dashboard.AppPendingRequestsCard
import com.fab.wab.merchant.designsystem.components.dashboard.AppSalonStateStrip
import com.fab.wab.merchant.designsystem.components.dashboard.AppWarningBanner
import com.fab.wab.merchant.designsystem.components.dashboard.KpiTone
import com.fab.wab.merchant.designsystem.components.dashboard.PendingRequestUi
import com.fab.wab.merchant.designsystem.components.layout.AppScreen
import com.fab.wab.merchant.designsystem.theme.AppTheme
import kotlin.time.Duration.Companion.hours
import kotlin.time.Duration.Companion.minutes

private const val PENDING_TOTAL = 3
private const val BRIDE_PERSONS = 3

private val PendingBride = BookingCardUi(
    id = "b1", reference = "WAB-24817", customerName = "سارة العلي", date = "اليوم", time = "4:00 م",
    persons = BRIDE_PERSONS, staff = "رنا، دانة", status = BookingStatus.PENDING, payment = PaymentStatus.DEPOSIT_PAID,
    isBride = true, pendingAge = 5.minutes, autoCancelIn = 6.hours + 50.minutes,
)

private val CancelledRefund = PendingBride.copy(
    id = "b2", reference = "WAB-24790", customerName = "نور خليل", persons = 1, staff = "هبة", isBride = false,
    status = BookingStatus.CANCELLED_BY_SALON, payment = PaymentStatus.FULLY_PAID, refund = RefundStatus.REFUND_PENDING,
    pendingAge = null, autoCancelIn = null,
)

private val Requests = listOf(
    PendingRequestUi("r1", "سارة العلي", BRIDE_PERSONS, "اليوم 4:00 م", 5.minutes, isBride = true, autoCancelIn = 6.hours),
    PendingRequestUi("r2", "ريم الزعبي", 1, "غداً 11:30 ص", 1.hours),
)

private val History = listOf(
    StatusHistoryEntryUi("طلب حجز جديد", "سارة العلي", "قبل ساعة"),
    StatusHistoryEntryUi("تم الرفض", "ليلى حداد · المالك", "قبل 10 دقائق", note = "الموظف غير متاح"),
)

/** Merchant components (MER-014) as drawn in design 02 Home and 03 Bookings. */
@Composable
private fun MerchantGallery() {
    val spacing = AppTheme.spacing
    AppScreen {
        Column(
            modifier = Modifier.verticalScroll(rememberScrollState()).padding(spacing.space20),
            verticalArrangement = Arrangement.spacedBy(spacing.space14),
        ) {
            AppSalonStateStrip(SalonState.LIVE)
            AppWarningBanner(title = "تنتهي الفترة المجانية خلال 5 أيام", body = "تواصل مع WAB لتفعيل الاشتراك الشهري", onClick = {})
            AppPendingRequestsCard(count = PENDING_TOTAL, requests = Requests, onViewAll = {}, onRequestClick = {})
            Row(horizontalArrangement = Arrangement.spacedBy(spacing.space10)) {
                AppKpiTile(value = "8", label = "حجوزات اليوم", modifier = Modifier.weight(1f))
                AppKpiTile(value = "3", label = "مكتملة", tone = KpiTone.Success, modifier = Modifier.weight(1f))
                AppNextBookingTile(caption = "التالي", time = "4:00 م", subtitle = "سارة العلي", modifier = Modifier.weight(1f))
            }
            AppBookingCard(PendingBride, onClick = {})
            AppBookingCard(CancelledRefund, onClick = {})
            AppStatusTimeline(History)
        }
    }
}

@Composable
private fun MerchantPreviewFrame(dark: Boolean, rtl: Boolean) {
    val direction = if (rtl) LayoutDirection.Rtl else LayoutDirection.Ltr
    CompositionLocalProvider(LocalLayoutDirection provides direction) {
        AppTheme(darkTheme = dark) { MerchantGallery() }
    }
}

@Preview(widthDp = 390, heightDp = 1400)
@Composable
private fun MerchantLightRtlPreview() = MerchantPreviewFrame(dark = false, rtl = true)

@Preview(widthDp = 390, heightDp = 1400)
@Composable
private fun MerchantDarkRtlPreview() = MerchantPreviewFrame(dark = true, rtl = true)

@Preview(widthDp = 390, heightDp = 1400)
@Composable
private fun MerchantLightLtrPreview() = MerchantPreviewFrame(dark = false, rtl = false)
