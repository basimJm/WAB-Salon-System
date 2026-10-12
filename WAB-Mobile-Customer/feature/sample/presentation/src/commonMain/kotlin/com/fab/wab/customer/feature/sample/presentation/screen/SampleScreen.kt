package com.fab.wab.customer.feature.sample.presentation.screen

import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.material3.Button
import androidx.compose.material3.Card
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.unit.dp
import com.fab.wab.customer.feature.sample.domain.model.SampleItem
import com.fab.wab.customer.feature.sample.presentation.controller.contract.SampleContract.UiAction
import com.fab.wab.customer.feature.sample.presentation.controller.contract.SampleContract.UiState
import com.fab.wab.customer.feature.sample.presentation.resources.Res
import com.fab.wab.customer.feature.sample.presentation.resources.sample_empty
import com.fab.wab.customer.feature.sample.presentation.resources.sample_retry
import org.jetbrains.compose.resources.stringResource

@Composable
fun SampleScreen(
    state: UiState,
    onEvent: (UiAction) -> Unit,
    modifier: Modifier = Modifier,
) {
    Box(modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
        when {
            state.isLoading -> CircularProgressIndicator()

            state.errorMessage != null -> Column(
                horizontalAlignment = Alignment.CenterHorizontally,
                verticalArrangement = Arrangement.spacedBy(12.dp),
            ) {
                Text(state.errorMessage, style = MaterialTheme.typography.bodyMedium)
                Button(onClick = { onEvent(UiAction.OnRefresh) }) {
                    Text(stringResource(Res.string.sample_retry))
                }
            }

            state.isEmpty -> Text(
                stringResource(Res.string.sample_empty),
                style = MaterialTheme.typography.bodyMedium,
            )

            else -> LazyColumn(
                modifier = Modifier.fillMaxSize(),
                contentPadding = PaddingValues(16.dp),
                verticalArrangement = Arrangement.spacedBy(12.dp),
            ) {
                items(state.items, key = { it.id }) { item ->
                    SampleItemCard(item = item, onClick = { onEvent(UiAction.OnItemClicked(item.id)) })
                }
            }
        }
    }
}

@Composable
private fun SampleItemCard(item: SampleItem, onClick: () -> Unit) {
    Card(modifier = Modifier.fillMaxWidth().clickable(onClick = onClick)) {
        Column(Modifier.padding(16.dp), verticalArrangement = Arrangement.spacedBy(4.dp)) {
            Text(item.title, style = MaterialTheme.typography.titleMedium)
            Text(item.description, style = MaterialTheme.typography.bodyMedium)
        }
    }
}
