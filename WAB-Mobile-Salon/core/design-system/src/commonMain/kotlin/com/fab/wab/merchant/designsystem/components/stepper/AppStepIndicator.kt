package com.fab.wab.merchant.designsystem.components.stepper

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.size
import androidx.compose.material3.Icon
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.semantics.contentDescription
import androidx.compose.ui.semantics.semantics
import com.fab.wab.merchant.designsystem.components.text.AppText
import com.fab.wab.merchant.designsystem.icons.AppIcons
import com.fab.wab.merchant.designsystem.resources.Res
import com.fab.wab.merchant.designsystem.resources.step_description
import com.fab.wab.merchant.designsystem.theme.AppTheme
import com.fab.wab.merchant.designsystem.utils.brandBackground
import com.fab.wab.merchant.designsystem.utils.brandBrush
import org.jetbrains.compose.resources.stringResource

enum class StepState { Done, Current, Upcoming }

/** State of step [index] (0-based) when the flow is at [current]. Pure and tested. */
fun stepState(index: Int, current: Int): StepState = when {
    index < current -> StepState.Done
    index == current -> StepState.Current
    else -> StepState.Upcoming
}

/** multi-step flow progress: numbered dots joined by lines; done steps show a check. */
@Composable
fun AppStepIndicator(
    currentStep: Int,
    stepCount: Int,
    modifier: Modifier = Modifier,
) {
    val colors = AppTheme.colors
    val sizes = AppTheme.sizes
    val description = stringResource(Res.string.step_description, currentStep + 1, stepCount)
    Row(
        modifier = modifier.fillMaxWidth().semantics { contentDescription = description },
        verticalAlignment = Alignment.CenterVertically,
        horizontalArrangement = Arrangement.spacedBy(AppTheme.spacing.space4),
    ) {
        repeat(stepCount) { index ->
            val state = stepState(index, currentStep)
            val dotModifier = Modifier.size(sizes.stepDot)
            Box(
                modifier = if (state == StepState.Upcoming) {
                    dotModifier.background(colors.soft, AppTheme.shapes.circle)
                } else {
                    dotModifier.brandBackground(brandBrush(), AppTheme.shapes.circle)
                },
                contentAlignment = Alignment.Center,
            ) {
                if (state == StepState.Done) {
                    Icon(AppIcons.Check, contentDescription = null, tint = colors.onGradient, modifier = Modifier.size(sizes.iconSmall))
                } else {
                    AppText(
                        text = (index + 1).toString(),
                        style = AppTheme.typography.labelSmall,
                        color = if (state == StepState.Current) colors.onGradient else colors.faint,
                    )
                }
            }
            if (index < stepCount - 1) {
                Box(
                    Modifier
                        .weight(1f)
                        .height(sizes.stepLine)
                        .background(if (state == StepState.Done) colors.gradientStart else colors.line),
                )
            }
        }
    }
}
