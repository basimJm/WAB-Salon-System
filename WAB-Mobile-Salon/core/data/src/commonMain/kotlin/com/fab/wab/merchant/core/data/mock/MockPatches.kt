package com.fab.wab.merchant.core.data.mock

import kotlinx.serialization.SerializationException
import kotlinx.serialization.json.Json
import kotlinx.serialization.json.JsonArray
import kotlinx.serialization.json.JsonElement
import kotlinx.serialization.json.JsonObject
import kotlinx.serialization.json.JsonPrimitive
import kotlinx.serialization.json.contentOrNull
import kotlinx.serialization.json.jsonPrimitive

private const val STATE_KEY = "state"
private const val ROLE_KEY = "role"
private const val PERMISSIONS_KEY = "permissions"
private val SALON_STATES = MockSalonState.entries.map { it.name }.toSet()

/**
 * Applies the dev overrides to a fixture: every salon `state` becomes [salonState], every member `role` / `permissions`
 * becomes [member]. Fields that are not salon states (other `state` values) stay; null overrides change nothing.
 */
fun patchFixture(json: String, salonState: MockSalonState?, member: MockMember?): String {
    if (salonState == null && member == null) return json
    val root = try {
        Json.parseToJsonElement(json)
    } catch (ignored: SerializationException) {
        return json
    }
    return patch(root, salonState, member).toString()
}

private fun patch(element: JsonElement, salonState: MockSalonState?, member: MockMember?): JsonElement = when (element) {
    is JsonObject -> JsonObject(element.mapValues { (key, value) -> patchField(key, value, salonState, member) })
    is JsonArray -> JsonArray(element.map { patch(it, salonState, member) })
    else -> element
}

private fun patchField(key: String, value: JsonElement, salonState: MockSalonState?, member: MockMember?): JsonElement = when {
    key == STATE_KEY && salonState != null && value is JsonPrimitive && value.jsonPrimitive.contentOrNull in SALON_STATES ->
        JsonPrimitive(salonState.name)
    key == ROLE_KEY && member != null && value is JsonPrimitive -> JsonPrimitive(member.role)
    key == PERMISSIONS_KEY && member != null && value is JsonArray -> JsonArray(member.permissions.sorted().map(::JsonPrimitive))
    else -> patch(value, salonState, member)
}
