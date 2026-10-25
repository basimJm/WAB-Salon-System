package com.fab.wab.merchant.core.data.mock

import com.fab.wab.merchant.core.data.contract.generated.MerchantOperations
import com.fab.wab.merchant.core.data.contract.generated.MockFixtures
import com.fab.wab.merchant.core.data.contract.generated.Operation

/** The API namespace `api_sync.py` strips when it keys the fixture table. */
private const val NAMESPACE_PREFIX = "/merchant/v1"
private const val PATH_PARAM_START = "{"
private const val BY = "By"

/** Operation id exactly as `api_sync.py` keys the fixture table: `GET /merchant/v1/bookings/{id}` → `GetBookingsById`. */
fun fixtureKeyOf(operation: Operation): String {
    val rest = operation.path.removePrefix(NAMESPACE_PREFIX).trim('/')
    val segments = rest.split("/").filter { it.isNotEmpty() }.joinToString("") { segment ->
        if (segment.startsWith(PATH_PARAM_START)) BY + pascal(segment.drop(1).dropLast(1)) else pascal(segment)
    }
    return operation.method.name.lowercase().replaceFirstChar { it.uppercase() } + segments
}

private fun pascal(segment: String): String =
    segment.split('-', '_').filter { it.isNotEmpty() }.joinToString("") { it.replaceFirstChar { c -> c.uppercase() } }

/** One fixture per contract operation (generated from the response schema), so every endpoint answers in mock mode. */
fun contractFixtures(operations: List<Operation> = MerchantOperations.all): List<MockFixture> =
    operations.mapNotNull { op ->
        MockFixtures.byOperationId[fixtureKeyOf(op)]?.let { json -> MockFixture(op.method.name, op.path, json) }
    }
