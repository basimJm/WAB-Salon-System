package com.fab.wab.merchant.core.data.branch

import com.fab.wab.merchant.core.data.BaseResponse
import com.fab.wab.merchant.core.data.contract.generated.GetBranchesByBranchIdData
import com.fab.wab.merchant.core.data.contract.generated.PostBranchesBody
import com.fab.wab.merchant.core.data.contract.generated.PostBranchesBodyLocation
import com.fab.wab.merchant.core.data.contract.generated.PostBranchesBodyName
import com.fab.wab.merchant.core.domain.AppError
import com.fab.wab.merchant.core.domain.AppResult
import com.fab.wab.merchant.core.domain.ErrorCode
import com.fab.wab.merchant.core.domain.branch.Branch
import com.fab.wab.merchant.core.domain.branch.BranchForm
import com.fab.wab.merchant.core.domain.branch.BranchName
import com.fab.wab.merchant.core.domain.branch.BranchStatus
import com.fab.wab.merchant.core.domain.branch.BranchesRepository
import com.fab.wab.merchant.core.domain.branch.normalizeBranchPhone
import com.fab.wab.merchant.core.domain.branch.ordered
import com.fab.wab.merchant.core.domain.mapSuccess
import com.fab.wab.merchant.core.domain.model.LocationData
import com.fab.wab.merchant.core.network.safeApiCall
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.serialization.json.JsonNull
import kotlinx.serialization.json.JsonObject
import kotlinx.serialization.json.JsonPrimitive
import kotlinx.serialization.json.buildJsonObject
import kotlinx.serialization.json.put

/** Keeps the last list so the switcher and the management screen share it; every write updates it in place. */
class BranchesRepositoryImpl(private val api: BranchesApi) : BranchesRepository {
    private val state = MutableStateFlow<List<Branch>>(emptyList())

    override val branches: StateFlow<List<Branch>> = state.asStateFlow()

    override suspend fun refresh(): AppResult<List<Branch>> {
        val result = safeApiCall { api.list() }.mapSuccess { response -> response.data.map { it.toDomain() }.ordered() }
        if (result is AppResult.Success) state.value = result.data
        return result
    }

    override suspend fun create(form: BranchForm): AppResult<Branch> {
        val body = form.toCreateBody()
            ?: return AppResult.Error(AppError.ServerError(ErrorCode.VALIDATION_ERROR, LOCAL_VALIDATION_STATUS, message = null))
        return write { api.create(body) }
    }

    override suspend fun update(id: String, form: BranchForm): AppResult<Branch> = write { api.update(id, form.toPatchBody()) }

    /** Another branch stops being main, so the whole list is reloaded after a success. */
    override suspend fun setMain(id: String): AppResult<Branch> = write { api.setMain(id) }.also {
        if (it is AppResult.Success) refresh()
    }

    override suspend fun setOffline(id: String, reason: String): AppResult<Branch> = write { api.setOffline(id, reason.trim()) }

    override suspend fun setOnline(id: String): AppResult<Branch> = write { api.setOnline(id) }

    override suspend fun close(id: String): AppResult<Branch> = write { api.close(id) }

    private suspend fun write(call: suspend () -> BaseResponse<GetBranchesByBranchIdData>): AppResult<Branch> {
        val result = safeApiCall { call() }.mapSuccess { it.data.toDomain() }
        if (result is AppResult.Success) {
            val branch = result.data
            val others = state.value.filterNot { it.id == branch.id }
            state.value = (others + branch).ordered()
        }
        return result
    }
}

/** Blank texts read as missing; unknown statuses as CLOSED. */
fun GetBranchesByBranchIdData.toDomain(): Branch = Branch(
    id = id,
    name = BranchName(ar = name.ar, en = name.en),
    isMain = isMain,
    status = BranchStatus.fromCode(status),
    location = location?.let { LocationData(it.latitude, it.longitude) },
    locationText = locationText?.takeIf { it.isNotBlank() },
    cityId = cityId,
    areaId = areaId,
    phone = phone?.takeIf { it.isNotBlank() },
    whatsapp = whatsapp?.takeIf { it.isNotBlank() },
    offlineReason = offline?.reason?.takeIf { it.isNotBlank() },
    missing = completeness.missing,
)

/** Null when a required field is missing (the form validates first, so this only guards the contract). */
fun BranchForm.toCreateBody(): PostBranchesBody? {
    val point = location ?: return null
    return PostBranchesBody(
        name = PostBranchesBodyName(ar = nameAr.trim(), en = nameEn.trim()),
        location = PostBranchesBodyLocation(point.latitude, point.longitude),
        locationText = locationText.trim(),
        cityId = cityId ?: return null,
        areaId = areaId ?: return null,
        phone = normalizeBranchPhone(phone),
        whatsapp = normalizeBranchPhone(whatsapp).ifEmpty { null },
    )
}

/** Status reported for a body refused before sending (same as the server's validation answer). */
private const val LOCAL_VALIDATION_STATUS = 422
private const val NAME = "name"
private const val AR = "ar"
private const val EN = "en"
private const val LOCATION = "location"
private const val LATITUDE = "latitude"
private const val LONGITUDE = "longitude"
private const val LOCATION_TEXT = "locationText"
private const val CITY_ID = "cityId"
private const val AREA_ID = "areaId"
private const val PHONE = "phone"
private const val WHATSAPP = "whatsapp"

/** The whole form; a cleared WhatsApp number is an explicit `null`. */
fun BranchForm.toPatchBody(): JsonObject = buildJsonObject {
    put(NAME, buildJsonObject {
        put(AR, nameAr.trim())
        put(EN, nameEn.trim())
    })
    location?.let { point ->
        put(LOCATION, buildJsonObject {
            put(LATITUDE, point.latitude)
            put(LONGITUDE, point.longitude)
        })
    }
    put(LOCATION_TEXT, locationText.trim())
    cityId?.let { put(CITY_ID, it) }
    areaId?.let { put(AREA_ID, it) }
    put(PHONE, normalizeBranchPhone(phone))
    put(WHATSAPP, normalizeBranchPhone(whatsapp).ifEmpty { null }?.let(::JsonPrimitive) ?: JsonNull)
}
