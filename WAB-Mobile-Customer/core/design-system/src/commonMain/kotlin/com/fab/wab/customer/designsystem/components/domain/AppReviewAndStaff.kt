package com.fab.wab.customer.designsystem.components.domain

import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.width
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.semantics.Role
import androidx.compose.ui.text.style.TextAlign
import com.fab.wab.customer.designsystem.components.avatar.AppAvatar
import com.fab.wab.customer.designsystem.components.badge.AppStatusBadge
import com.fab.wab.customer.designsystem.components.badge.StatusTone
import com.fab.wab.customer.designsystem.components.card.AppCard
import com.fab.wab.customer.designsystem.components.text.AppExpandableText
import com.fab.wab.customer.designsystem.components.text.AppText
import com.fab.wab.customer.designsystem.resources.Res
import com.fab.wab.customer.designsystem.resources.card_see_more
import com.fab.wab.customer.designsystem.resources.staff_on_duty
import com.fab.wab.customer.designsystem.resources.staff_on_leave
import com.fab.wab.customer.designsystem.theme.AppTheme
import org.jetbrains.compose.resources.stringResource

private const val COMMENT_LINES = 3

/** Review item (S07 item 9, S08/S09): author, stars, comment truncated with "See more", date. */
@Composable
fun AppReviewItem(
    review: ReviewUi,
    modifier: Modifier = Modifier,
    onExpandRequest: (() -> Unit)? = null,
) {
    val spacing = AppTheme.spacing
    AppCard(modifier = modifier.fillMaxWidth(), contentPadding = spacing.space12) {
        Column(verticalArrangement = Arrangement.spacedBy(spacing.space6)) {
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically,
            ) {
                AppText(text = review.authorName, style = AppTheme.typography.titleSmall, maxLines = 1)
                AppText(text = review.dateText, style = AppTheme.typography.labelSmall, color = AppTheme.colors.muted, maxLines = 1)
            }
            RatingLine(review.rating)
            AppExpandableText(
                text = review.comment,
                collapsedLines = COMMENT_LINES,
                moreLabel = stringResource(Res.string.card_see_more),
                onExpandRequest = onExpandRequest,
            )
        }
    }
}

/** Staff avatar item of the salon's horizontal staff row (S07 item 8): photo, first name, availability. */
@Composable
fun AppStaffItem(
    staff: StaffItemUi,
    onClick: () -> Unit,
    modifier: Modifier = Modifier,
) {
    val spacing = AppTheme.spacing
    Column(
        modifier = modifier
            .width(AppTheme.sizes.avatarLarge)
            .clickable(role = Role.Button, onClick = onClick),
        horizontalAlignment = Alignment.CenterHorizontally,
        verticalArrangement = Arrangement.spacedBy(spacing.space6),
    ) {
        AppAvatar(name = staff.name, imageUrl = staff.imageUrl, available = staff.onDutyToday)
        AppText(text = firstNameOf(staff.name), style = AppTheme.typography.labelMedium, maxLines = 1, textAlign = TextAlign.Center)
        AppStatusBadge(
            text = stringResource(if (staff.onDutyToday) Res.string.staff_on_duty else Res.string.staff_on_leave),
            tone = if (staff.onDutyToday) StatusTone.Success else StatusTone.Neutral,
        )
    }
}
