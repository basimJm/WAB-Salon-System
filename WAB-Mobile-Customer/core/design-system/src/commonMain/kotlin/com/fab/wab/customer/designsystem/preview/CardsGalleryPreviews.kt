package com.fab.wab.customer.designsystem.preview

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.verticalScroll
import androidx.compose.runtime.Composable
import androidx.compose.runtime.CompositionLocalProvider
import androidx.compose.ui.Modifier
import androidx.compose.ui.platform.LocalLayoutDirection
import androidx.compose.ui.tooling.preview.Preview
import androidx.compose.ui.unit.LayoutDirection
import androidx.compose.ui.unit.dp
import com.fab.wab.customer.designsystem.components.domain.AppReviewItem
import com.fab.wab.customer.designsystem.components.domain.AppSalonCard
import com.fab.wab.customer.designsystem.components.domain.AppSalonServiceRow
import com.fab.wab.customer.designsystem.components.domain.AppServiceCardCompact
import com.fab.wab.customer.designsystem.components.domain.AppServiceCardExpandable
import com.fab.wab.customer.designsystem.components.domain.AppStaffItem
import com.fab.wab.customer.designsystem.components.domain.ReviewUi
import com.fab.wab.customer.designsystem.components.domain.SalonCardLayout
import com.fab.wab.customer.designsystem.components.domain.SalonCardUi
import com.fab.wab.customer.designsystem.components.domain.ServiceCardUi
import com.fab.wab.customer.designsystem.components.domain.StaffItemUi
import com.fab.wab.customer.designsystem.theme.AppTheme
import com.fab.wab.customer.designsystem.theme.AppWindowSize

private val SampleSalon = SalonCardUi(
    id = "s1",
    name = "صالون لمسة جمال",
    imageUrl = null,
    rating = 4.5f,
    locationText = "عمّان، الصويفية",
    description = "صالون نسائي متخصص بالعرائس والعناية بالبشرة والشعر مع فريق من الخبيرات، نقدم أفضل الخدمات بأسعار مناسبة.",
    isOpen = true,
    todayHours = "8:00 ص – 4:00 م",
    isFavorite = true,
)

private val SampleService = ServiceCardUi(
    id = "v1",
    name = "قص وتصفيف",
    imageUrl = null,
    description = "قص الشعر وتصفيفه بأحدث الصيحات مع استشارة مجانية لاختيار القصة المناسبة لشكل الوجه.",
    durationMinutes = 45,
    priceText = "25.000 د.أ",
)

private val SampleReview = ReviewUi(
    id = "r1",
    authorName = "ريم",
    rating = 5f,
    comment = "خدمة ممتازة والموظفات محترفات جداً، المكان نظيف ومرتب والمواعيد دقيقة. أنصح الجميع بالتجربة وسأعود بالتأكيد.",
    dateText = "منذ يومين",
)

@Composable
private fun CardsGallery() {
    Column(
        modifier = Modifier
            .fillMaxWidth()
            .background(AppTheme.colors.background)
            .verticalScroll(rememberScrollState())
            .padding(AppTheme.adaptive.horizontalPadding),
        verticalArrangement = Arrangement.spacedBy(AppTheme.spacing.space16),
    ) {
        AppSalonCard(salon = SampleSalon, onClick = {}, onFavoriteClick = {})
        Row(horizontalArrangement = Arrangement.spacedBy(AppTheme.spacing.space12)) {
            AppSalonCard(
                salon = SampleSalon.copy(isOpen = false, todayHours = null, isFavorite = false),
                onClick = {},
                onFavoriteClick = {},
                layout = SalonCardLayout.Horizontal,
            )
            AppServiceCardCompact(service = SampleService, onClick = {})
        }
        AppServiceCardExpandable(service = SampleService, onClick = {})
        AppSalonServiceRow(service = SampleService, onClick = {})
        AppReviewItem(review = SampleReview)
        Row(horizontalArrangement = Arrangement.spacedBy(AppTheme.spacing.space12)) {
            AppStaffItem(staff = StaffItemUi("m1", "سارة الأحمد", null, onDutyToday = true), onClick = {})
            AppStaffItem(staff = StaffItemUi("m2", "Lina Haddad", null, onDutyToday = false), onClick = {})
        }
    }
}

@Composable
private fun CardsPreviewFrame(dark: Boolean, rtl: Boolean, width: Int, height: Int) {
    val direction = if (rtl) LayoutDirection.Rtl else LayoutDirection.Ltr
    CompositionLocalProvider(LocalLayoutDirection provides direction) {
        AppTheme(darkTheme = dark, windowSize = AppWindowSize(width.dp, height.dp)) { CardsGallery() }
    }
}

@Preview(widthDp = 390, heightDp = 844)
@Composable
private fun CardsPhonePortraitLightRtlPreview() = CardsPreviewFrame(dark = false, rtl = true, width = 390, height = 844)

@Preview(widthDp = 390, heightDp = 844)
@Composable
private fun CardsPhonePortraitDarkLtrPreview() = CardsPreviewFrame(dark = true, rtl = false, width = 390, height = 844)

@Preview(widthDp = 844, heightDp = 390)
@Composable
private fun CardsPhoneLandscapeLightRtlPreview() = CardsPreviewFrame(dark = false, rtl = true, width = 844, height = 390)

@Preview(widthDp = 1024, heightDp = 768)
@Composable
private fun CardsTabletLandscapeDarkRtlPreview() = CardsPreviewFrame(dark = true, rtl = true, width = 1024, height = 768)
