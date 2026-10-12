package com.fab.wab.customer.designsystem.components.card

import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.BoxScope
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.unit.dp
import com.fab.wab.customer.designsystem.utils.glassEffect

private val CardShape = RoundedCornerShape(24.dp)
private val CardPadding = 24.dp


@Composable
fun AppCard(
    modifier: Modifier = Modifier,
    content: @Composable BoxScope.() -> Unit,
) {
    Box(
        modifier = modifier
            .clip(CardShape),
    ) {
        Box(modifier = Modifier.matchParentSize().glassEffect())
        Box(
            modifier = Modifier.align(Alignment.Center).padding(CardPadding),
            contentAlignment = Alignment.Center
        ) {
            content()
        }
    }
}