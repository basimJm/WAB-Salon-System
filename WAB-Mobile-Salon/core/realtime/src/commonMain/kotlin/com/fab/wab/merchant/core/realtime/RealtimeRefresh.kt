package com.fab.wab.merchant.core.realtime

import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.filter
import kotlinx.coroutines.flow.map
import kotlinx.serialization.json.jsonObject
import kotlinx.serialization.json.jsonPrimitive

/** Why a screen refreshes its data: a socket event, an FCM message while open, or the app returning. */
enum class RefreshReason { Realtime, Push, Foreground }

/** Payload keys shared by the `entity.updated` summary and the FCM data message. */
object RealtimePayloadKeys {
    const val ID = "id"
    const val STATUS = "status"
    const val UPDATED_AT = "updatedAt"
}

/** The entity a `entity.updated` event is about; null when the payload carries no id. */
fun RealtimeEvent.entityId(): String? = runCatching {
    val obj = payload.jsonObject
    obj[RealtimePayloadKeys.ID]?.jsonPrimitive?.content?.takeIf { it.isNotBlank() }
}.getOrNull()

/**
 * Identity of an update: the same orders in the same state delivered twice (socket + push, or a reconnect replay)
 * must trigger one refresh. Events without an id are never considered duplicates.
 */
fun RealtimeEvent.updateKey(): String? {
    val id = entityId() ?: return null
    val obj = runCatching { payload.jsonObject }.getOrNull()
    val status = obj?.get(RealtimePayloadKeys.STATUS)?.jsonPrimitive?.content.orEmpty()
    val updatedAt = obj?.get(RealtimePayloadKeys.UPDATED_AT)?.jsonPrimitive?.content.orEmpty()
    return "$name:$id:$status:$updatedAt"
}

/**
 * Realtime events of [name] that matter to [entityId] (any entity when null), with consecutive duplicates dropped by
 * [updateKey] so a socket replay or a push for the same change does not refresh twice.
 */
fun Flow<RealtimeEvent>.refreshesFor(name: String, entityId: String? = null): Flow<RefreshReason> {
    var lastKey: String? = null
    return filter { it.name == name }
        .filter { event -> entityId == null || event.entityId().let { it == null || it == entityId } }
        .filter { event ->
            val key = event.updateKey()
            val duplicate = key != null && key == lastKey
            if (key != null) lastKey = key
            !duplicate
        }
        .map { RefreshReason.Realtime }
}
