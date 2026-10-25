package com.fab.wab.merchant.core.network.client

import kotlinx.serialization.json.Json

/**
 * JSON settings of every API call, shared with the contract tests (MER-054) so a fixture decodes exactly as on the wire:
 * unknown fields are ignored (the contract grows additively) and absent optionals stay at their defaults.
 */
object NetworkJson {
    val json: Json = Json {
        prettyPrint = true
        isLenient = true
        ignoreUnknownKeys = true
        explicitNulls = false
    }
}
