package com.fab.wab.customer.feature.onboarding.presentation.screen

import androidx.compose.ui.graphics.vector.ImageVector
import com.fab.wab.customer.designsystem.icons.AppIcons
import com.fab.wab.customer.feature.onboarding.domain.model.OnboardingPage
import com.fab.wab.customer.feature.onboarding.presentation.resources.Res
import com.fab.wab.customer.feature.onboarding.presentation.resources.onboarding_book_text
import com.fab.wab.customer.feature.onboarding.presentation.resources.onboarding_book_title
import com.fab.wab.customer.feature.onboarding.presentation.resources.onboarding_bride_text
import com.fab.wab.customer.feature.onboarding.presentation.resources.onboarding_bride_title
import com.fab.wab.customer.feature.onboarding.presentation.resources.onboarding_discover_text
import com.fab.wab.customer.feature.onboarding.presentation.resources.onboarding_discover_title
import com.fab.wab.customer.feature.onboarding.presentation.resources.onboarding_image_description
import com.fab.wab.customer.feature.onboarding.presentation.resources.onboarding_pay_text
import com.fab.wab.customer.feature.onboarding.presentation.resources.onboarding_pay_title
import org.jetbrains.compose.resources.StringResource

/**
 * Bundled page content (PRD S01: static, defined by the design); illustrations are icon placeholders until the owner
 * supplies art.
 */
internal data class OnboardingVisuals(
    val icon: ImageVector,
    val title: StringResource,
    val text: StringResource,
    val imageDescription: StringResource = Res.string.onboarding_image_description,
)

internal fun OnboardingPage.visuals(): OnboardingVisuals = when (this) {
    OnboardingPage.DISCOVER ->
        OnboardingVisuals(AppIcons.Discover, Res.string.onboarding_discover_title, Res.string.onboarding_discover_text)
    OnboardingPage.BOOK -> OnboardingVisuals(AppIcons.Booking, Res.string.onboarding_book_title, Res.string.onboarding_book_text)
    OnboardingPage.BRIDE -> OnboardingVisuals(AppIcons.Bride, Res.string.onboarding_bride_title, Res.string.onboarding_bride_text)
    OnboardingPage.PAY -> OnboardingVisuals(AppIcons.Payment, Res.string.onboarding_pay_title, Res.string.onboarding_pay_text)
}
