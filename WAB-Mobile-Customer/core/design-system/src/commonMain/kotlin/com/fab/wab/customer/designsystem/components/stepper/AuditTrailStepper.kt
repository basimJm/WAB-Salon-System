package com.fab.wab.customer.designsystem.components.stepper

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.unit.dp
import com.fab.wab.customer.designsystem.components.spacer.AppSpacerVertical
import com.fab.wab.customer.designsystem.components.text.AppText
import com.fab.wab.customer.designsystem.components.text.AppTextStyles
import com.fab.wab.customer.designsystem.theme.LocalAppColors
import com.fab.wab.customer.designsystem.theme.LocalSpacing
import org.jetbrains.compose.resources.stringResource

@Composable
fun AuditTrailStepper(
    state: AuditTrailStepperState,
    modifier: Modifier = Modifier,
    showLabels: Boolean = true,
    compact: Boolean = false,
) {
    val spacing = LocalSpacing.current
    val colors = LocalAppColors.current

    val stepSize = if (compact) 24.dp else 32.dp
    val lineHeight = if (compact) 2.dp else 3.dp

    Column(
        modifier = modifier.fillMaxWidth(),
        verticalArrangement = Arrangement.spacedBy(spacing.space8)
    ) {
        Row(
            modifier = Modifier.fillMaxWidth(),
            horizontalArrangement = Arrangement.SpaceBetween,
            verticalAlignment = Alignment.CenterVertically
        ) {
            state.steps.forEachIndexed { index, step ->
                val isLast = index == state.steps.lastIndex

                Column(
                    horizontalAlignment = Alignment.CenterHorizontally,
                    modifier = Modifier.weight(1f)
                ) {
                    Box(
                        contentAlignment = Alignment.Center,
                        modifier = Modifier.size(stepSize)
                    ) {
                        if (!isLast) {
                            val lineColor = when {
                                step.isReached && !step.isCurrent -> colors.primary
                                step.isCurrent -> colors.primary.copy(alpha = 0.5f)
                                else -> colors.outline.copy(alpha = 0.3f)
                            }

                            Box(
                                modifier = Modifier
                                    .width(if (compact) 20.dp else 30.dp)
                                    .height(lineHeight)
                                    .align(Alignment.CenterEnd)
                                    .background(lineColor, RoundedCornerShape(1.dp))
                            )
                        }

                        StepIndicator(
                            step = step,
                            size = stepSize,
                            colors = colors
                        )
                    }

                    if (showLabels && !compact) {
                        AppSpacerVertical(size = spacing.space4)
                        AppTextStyles.labelSmall(
                            text = stringResource(step.label),
                            color = when {
                                step.isCurrent -> colors.primary
                                step.isReached -> colors.onSurface
                                else -> colors.outline
                            },
                            modifier = Modifier.padding(horizontal = spacing.space2)
                        )
                    }
                }
            }
        }

        if (compact && showLabels) {
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween
            ) {
                state.steps.forEach { step ->
                    Box(modifier = Modifier.weight(1f)) {
                        AppText(
                            text = stringResource(step.label),
                            color = when {
                                step.isCurrent -> colors.primary
                                step.isReached -> colors.onSurface
                                else -> colors.outline
                            },
                            textAlign = androidx.compose.ui.text.style.TextAlign.Center,
                            modifier = Modifier.align(Alignment.Center)
                        )
                    }
                }
            }
        }
    }
}

@Composable
private fun StepIndicator(
    step: AuditTrailStep,
    size: androidx.compose.ui.unit.Dp,
    colors: com.fab.wab.customer.designsystem.theme.AppColors,
) {
    val dotSize = size * 0.5f
    val borderWidth = size * 0.1f

    when {
        step.isCurrent -> {
            Box(
                modifier = Modifier
                    .size(size)
                    .clip(CircleShape)
                    .background(colors.primary.copy(alpha = 0.1f))
                    .padding(borderWidth),
                contentAlignment = Alignment.Center
            ) {
                Box(
                    modifier = Modifier
                        .size(dotSize)
                        .clip(CircleShape)
                        .background(colors.primary)
                )
            }
        }

        step.isReached -> {
            Box(
                modifier = Modifier
                    .size(size)
                    .clip(CircleShape)
                    .background(colors.primary.copy(alpha = 0.1f))
                    .padding(borderWidth),
                contentAlignment = Alignment.Center
            ) {
                Box(
                    modifier = Modifier
                        .size(dotSize)
                        .clip(CircleShape)
                        .background(colors.primary)
                )
            }
        }

        else -> {
            Box(
                modifier = Modifier
                    .size(size)
                    .clip(CircleShape)
                    .background(Color.Transparent)
                    .padding(borderWidth),
                contentAlignment = Alignment.Center
            ) {
                Box(
                    modifier = Modifier
                        .size(dotSize)
                        .clip(CircleShape)
                        .background(colors.outline.copy(alpha = 0.3f))
                )
            }
        }
    }
}

@Composable
fun CompactAuditTrailStepper(
    state: AuditTrailStepperState,
    modifier: Modifier = Modifier,
) {
    val spacing = LocalSpacing.current
    val colors = LocalAppColors.current

    Row(
        modifier = modifier
            .fillMaxWidth()
            .clip(RoundedCornerShape(spacing.space8))
            .background(colors.surfaceContainerLow)
            .padding(horizontal = spacing.space8, vertical = spacing.space4),
        horizontalArrangement = Arrangement.SpaceBetween,
        verticalAlignment = Alignment.CenterVertically
    ) {
        state.steps.forEachIndexed { index, step ->
            val isLast = index == state.steps.lastIndex

            Row(
                verticalAlignment = Alignment.CenterVertically,
                modifier = Modifier.weight(1f)
            ) {
                CompactStepIndicator(
                    step = step,
                    colors = colors
                )

                if (!isLast) {
                    Box(
                        modifier = Modifier
                            .weight(1f)
                            .height(2.dp)
                            .background(
                                if (step.isReached) colors.primary else colors.outline.copy(alpha = 0.3f),
                                RoundedCornerShape(1.dp)
                            )
                    )
                }
            }
        }
    }
}

@Composable
private fun CompactStepIndicator(
    step: AuditTrailStep,
    colors: com.fab.wab.customer.designsystem.theme.AppColors,
) {
    val dotSize = 8.dp

    when {
        step.isCurrent -> {
            Box(
                modifier = Modifier
                    .size(16.dp)
                    .clip(CircleShape)
                    .background(colors.primary.copy(alpha = 0.2f))
                    .padding(4.dp),
                contentAlignment = Alignment.Center
            ) {
                Box(
                    modifier = Modifier
                        .size(dotSize)
                        .clip(CircleShape)
                        .background(colors.primary)
                )
            }
        }

        step.isReached -> {
            Box(
                modifier = Modifier
                    .size(16.dp)
                    .clip(CircleShape)
                    .background(colors.primary.copy(alpha = 0.2f))
                    .padding(4.dp),
                contentAlignment = Alignment.Center
            ) {
                Box(
                    modifier = Modifier
                        .size(dotSize)
                        .clip(CircleShape)
                        .background(colors.primary)
                )
            }
        }

        else -> {
            Box(
                modifier = Modifier
                    .size(16.dp)
                    .clip(CircleShape)
                    .background(Color.Transparent),
                contentAlignment = Alignment.Center
            ) {
                Box(
                    modifier = Modifier
                        .size(dotSize)
                        .clip(CircleShape)
                        .background(colors.outline.copy(alpha = 0.3f))
                )
            }
        }
    }
}

@Composable
fun OrderCardStepper(
    state: AuditTrailStepperState,
    modifier: Modifier = Modifier,
) {
    val spacing = LocalSpacing.current
    val colors = LocalAppColors.current

    Column(
        modifier = modifier.fillMaxWidth(),
        horizontalAlignment = Alignment.CenterHorizontally
    ) {
        Row(
            modifier = Modifier.fillMaxWidth(),
            verticalAlignment = Alignment.CenterVertically
        ) {
            state.steps.forEachIndexed { index, step ->
                val isLast = index == state.steps.lastIndex

                Box(
                    modifier = Modifier.weight(1f),
                    contentAlignment = Alignment.Center
                ) {
                    OrderCardStepIndicator(step = step, colors = colors)
                }

                if (!isLast) {
                    val lineColor = when {
                        step.isReached -> colors.primary
                        step.isCurrent -> colors.primary.copy(alpha = 0.5f)
                        else -> colors.outline.copy(alpha = 0.3f)
                    }
                    Box(
                        modifier = Modifier
                            .weight(1f)
                            .height(2.dp)
                            .background(lineColor, RoundedCornerShape(1.dp))
                    )
                }
            }
        }

        AppSpacerVertical(size = spacing.space4)

        Row(
            modifier = Modifier.fillMaxWidth(),
            horizontalArrangement = Arrangement.SpaceBetween
        ) {
            state.steps.forEach { step ->
                val labelColor = when {
                    step.isCurrent -> colors.primary
                    step.isReached -> colors.primary
                    else -> colors.outline.copy(alpha = 0.6f)
                }
                Box(modifier = Modifier.weight(1f)) {
                    AppTextStyles.labelSmall(
                        text = stringResource(step.label),
                        color = labelColor,
                        modifier = Modifier.align(Alignment.Center)
                    )
                }
            }
        }
    }
}

@Composable
private fun OrderCardStepIndicator(
    step: AuditTrailStep,
    colors: com.fab.wab.customer.designsystem.theme.AppColors,
) {
    val dotSize = 10.dp

    when {
        step.isCurrent -> {
            Box(
                modifier = Modifier
                    .size(20.dp)
                    .clip(CircleShape)
                    .background(colors.primary.copy(alpha = 0.15f))
                    .padding(5.dp),
                contentAlignment = Alignment.Center
            ) {
                Box(
                    modifier = Modifier
                        .size(dotSize)
                        .clip(CircleShape)
                        .background(colors.primary)
                )
            }
        }

        step.isReached -> {
            Box(
                modifier = Modifier
                    .size(20.dp)
                    .clip(CircleShape)
                    .background(Color.Transparent)
                    .padding(5.dp),
                contentAlignment = Alignment.Center
            ) {
                Box(
                    modifier = Modifier
                        .size(dotSize)
                        .clip(CircleShape)
                        .background(colors.primary)
                )
            }
        }

        else -> {
            Box(
                modifier = Modifier
                    .size(20.dp)
                    .clip(CircleShape)
                    .background(Color.Transparent)
                    .padding(5.dp),
                contentAlignment = Alignment.Center
            ) {
                Box(
                    modifier = Modifier
                        .size(dotSize)
                        .clip(CircleShape)
                        .background(colors.outline.copy(alpha = 0.4f))
                )
            }
        }
    }
}
