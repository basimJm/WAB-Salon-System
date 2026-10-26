package com.fab.wab.merchant.designsystem.components.avatar

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.size
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.text.TextStyle
import androidx.compose.ui.unit.Dp
import com.fab.wab.merchant.designsystem.components.image.AppImage
import com.fab.wab.merchant.designsystem.components.text.AppText
import com.fab.wab.merchant.designsystem.theme.AppTheme

/** First letter of the first and last word of [name], upper-cased; empty for a blank name. Pure and tested. */
fun initialsOf(name: String, maxLetters: Int = MAX_INITIALS): String =
    name.trim().split(Regex("\\s+")).filter { it.isNotEmpty() }.take(maxLetters)
        .joinToString("") { it.first().uppercase() }

private const val MAX_INITIALS = 2

/**
 * Circular photo with a letter fallback, and an optional availability dot (on duty / on leave). Small avatars pass a
 * smaller [initialsStyle] and one letter ([maxLetters], design 03 person staff circle).
 */
@Composable
fun AppAvatar(
    name: String,
    modifier: Modifier = Modifier,
    imageUrl: String? = null,
    size: Dp = AppTheme.sizes.avatar,
    available: Boolean? = null,
    initialsStyle: TextStyle = AppTheme.typography.titleMedium,
    maxLetters: Int = MAX_INITIALS,
) {
    val colors = AppTheme.colors
    Box(modifier = modifier.size(size)) {
        Box(
            modifier = Modifier.size(size).clip(AppTheme.shapes.circle).background(colors.soft),
            contentAlignment = Alignment.Center,
        ) {
            val letters: @Composable () -> Unit = {
                Box(modifier = Modifier.size(size).background(colors.soft), contentAlignment = Alignment.Center) {
                    AppText(text = initialsOf(name, maxLetters), style = initialsStyle, color = colors.accent, maxLines = 1)
                }
            }
            // A photo that fails to load falls back to the letters too (e2e: a broken-image icon in the staff circle).
            if (imageUrl != null) AppImage(url = imageUrl, modifier = Modifier.size(size), fallback = letters) else letters()
        }
        if (available != null) {
            Box(
                modifier = Modifier
                    .align(Alignment.BottomEnd)
                    .size(AppTheme.sizes.statusDot)
                    .background(if (available) colors.success else colors.faint, AppTheme.shapes.circle),
            )
        }
    }
}
