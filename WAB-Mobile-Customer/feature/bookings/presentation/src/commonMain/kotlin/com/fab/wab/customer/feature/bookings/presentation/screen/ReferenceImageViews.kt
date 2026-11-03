package com.fab.wab.customer.feature.bookings.presentation.screen

import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.text.font.FontWeight
import com.fab.wab.customer.designsystem.components.image.AppImage
import com.fab.wab.customer.designsystem.components.text.AppText
import com.fab.wab.customer.designsystem.theme.AppTheme
import com.fab.wab.customer.feature.bookings.presentation.resources.Res
import com.fab.wab.customer.feature.bookings.presentation.resources.reference_image_description
import com.fab.wab.customer.feature.bookings.presentation.resources.reference_image_title
import org.jetbrains.compose.resources.stringResource

/** A person's tattoo design image (signed URL from `GET /bookings/{id}`, BUSINESS_DOMAIN §5.23). */
@Composable
internal fun PersonReferenceImage(url: String, personName: String, modifier: Modifier = Modifier) {
    Column(modifier.fillMaxWidth().padding(bottom = AppTheme.spacing.space8)) {
        AppText(
            text = stringResource(Res.string.reference_image_title),
            style = AppTheme.typography.bodySmall.copy(fontWeight = FontWeight.SemiBold),
            color = AppTheme.colors.muted,
            modifier = Modifier.padding(bottom = AppTheme.spacing.space6),
        )
        AppImage(
            url = url,
            contentDescription = stringResource(Res.string.reference_image_description, personName),
            modifier = Modifier
                .fillMaxWidth()
                .height(BookingsDesign.referenceImageHeight)
                .clip(AppTheme.shapes.medium),
        )
    }
}
