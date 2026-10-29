package com.fab.wab.merchant.core.data.mock

import com.fab.wab.merchant.core.domain.salon.Audience
import com.fab.wab.merchant.core.domain.salon.BusinessKind
import kotlinx.serialization.SerializationException
import kotlinx.serialization.json.Json
import kotlinx.serialization.json.JsonArray
import kotlinx.serialization.json.JsonElement
import kotlinx.serialization.json.JsonObject
import kotlinx.serialization.json.JsonPrimitive
import kotlinx.serialization.json.contentOrNull

private const val STATE_KEY = "state"
private const val ROLE_KEY = "role"
private const val PERMISSIONS_KEY = "permissions"
private const val BUSINESS_TYPE_KEY = "businessType"
private val AUDIENCE_KEYS = setOf("audience", "salonAudience")
private val SALON_STATES = MockSalonState.entries.map { it.name }.toSet()
private val AUDIENCES = Audience.entries.map { it.name }.toSet()

private class Overrides(val salonState: MockSalonState?, val member: MockMember?, val kind: BusinessKind?)

/**
 * Applies the dev overrides to a fixture: every salon `state` becomes [salonState], every member `role` / `permissions`
 * becomes [member], every `businessType` / `audience` / `salonAudience` becomes [kind] (salon, catalog and bookings
 * alike, BUSINESS_DOMAIN §5.19). Fields that are not salon states (other `state` values) stay; null overrides change nothing.
 */
fun patchFixture(json: String, salonState: MockSalonState?, member: MockMember?, kind: BusinessKind? = null): String {
    if (salonState == null && member == null && kind == null) return json
    val root = try {
        Json.parseToJsonElement(json)
    } catch (ignored: SerializationException) {
        return json
    }
    return patch(root, Overrides(salonState, member, kind)).toString()
}

private fun patch(element: JsonElement, overrides: Overrides): JsonElement = when (element) {
    is JsonObject -> JsonObject(element.mapValues { (key, value) -> patchField(key, value, overrides) })
    is JsonArray -> JsonArray(element.map { patch(it, overrides) })
    else -> element
}

private fun patchField(key: String, value: JsonElement, overrides: Overrides): JsonElement {
    val text = (value as? JsonPrimitive)?.contentOrNull
    val state = overrides.salonState
    val member = overrides.member
    return when {
        key == STATE_KEY && state != null && text in SALON_STATES -> JsonPrimitive(state.name)
        key == ROLE_KEY && member != null && value is JsonPrimitive -> JsonPrimitive(member.role)
        key == PERMISSIONS_KEY && member != null && value is JsonArray -> JsonArray(member.permissions.sorted().map(::JsonPrimitive))
        else -> overrides.kind?.let { kindField(key, text, it) } ?: patch(value, overrides)
    }
}

/** `businessType` / `audience` / `salonAudience` of the chosen kind; null = not a kind field. */
private fun kindField(key: String, text: String?, kind: BusinessKind): JsonElement? = when {
    text == null -> null
    key == BUSINESS_TYPE_KEY -> JsonPrimitive(kind.type.name)
    key in AUDIENCE_KEYS && text in AUDIENCES -> JsonPrimitive(kind.audience.name)
    else -> null
}

private const val BOOKINGS_SEGMENT = "bookings"
private const val STATUS_KEY = "status"
private const val DATA_KEY = "data"
private const val PENDING = "PENDING"

/** `GET …/bookings/{id}` for an id marked pending answers with `data.status = PENDING`; anything else is unchanged. */
fun patchPendingBooking(json: String, path: String, pendingIds: Set<String>): String {
    val segments = path.trim('/').split('/')
    val id = segments.lastOrNull()
    if (pendingIds.isEmpty() || segments.dropLast(1).lastOrNull() != BOOKINGS_SEGMENT || id !in pendingIds) return json
    val root = try {
        Json.parseToJsonElement(json) as? JsonObject
    } catch (ignored: SerializationException) {
        null
    } ?: return json
    val data = root[DATA_KEY] as? JsonObject ?: return json
    return JsonObject(root + (DATA_KEY to JsonObject(data + (STATUS_KEY to JsonPrimitive(PENDING))))).toString()
}

