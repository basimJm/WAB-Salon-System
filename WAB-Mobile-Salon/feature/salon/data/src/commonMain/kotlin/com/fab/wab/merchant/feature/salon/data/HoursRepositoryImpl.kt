package com.fab.wab.merchant.feature.salon.data

import com.fab.wab.merchant.core.data.contract.generated.PatchSalonHoursClosuresByIdBody
import com.fab.wab.merchant.core.data.contract.generated.PostSalonHoursClosuresBody
import com.fab.wab.merchant.core.data.contract.generated.PutSalonHoursWeeklyBody
import com.fab.wab.merchant.core.domain.AppError
import com.fab.wab.merchant.core.domain.AppResult
import com.fab.wab.merchant.core.domain.mapSuccess
import com.fab.wab.merchant.core.domain.salon.SalonRepository
import com.fab.wab.merchant.core.network.safeApiCall
import com.fab.wab.merchant.feature.salon.domain.Closure
import com.fab.wab.merchant.feature.salon.domain.DaySchedule
import com.fab.wab.merchant.feature.salon.domain.HoursData
import com.fab.wab.merchant.feature.salon.domain.HoursRepository
import kotlinx.datetime.LocalDate

/** Diagnostic text when a closure comes back with unreadable dates (never shown to users). */
private const val UNREADABLE_CLOSURE = "closure dates not readable"

private fun Closure?.asResult(): AppResult<Closure> = this?.let {
    AppResult.Success(it)
} ?: AppResult.Error(AppError.UnknownError(UNREADABLE_CLOSURE))

/** Saving the weekly hours refreshes the shared salon (completeness `WORKING_HOURS`). */
class HoursRepositoryImpl(private val api: HoursApi, private val salon: SalonRepository) : HoursRepository {
    override suspend fun load(): AppResult<HoursData> = safeApiCall { api.load() }.mapSuccess { it.data.toDomain() }

    override suspend fun saveWeek(days: List<DaySchedule>): AppResult<HoursData> =
        safeApiCall { api.saveWeek(PutSalonHoursWeeklyBody(days.map { it.toBody() })) }.mapSuccess { it.data.toDomain() }
            .also { if (it is AppResult.Success) salon.refresh() }

    override suspend fun addClosure(from: LocalDate, to: LocalDate, reason: String): AppResult<Closure> =
        when (val result = safeApiCall { api.addClosure(PostSalonHoursClosuresBody(from.toString(), to.toString(), reason.trim())) }) {
            is AppResult.Success -> result.data.data.let { closureOf(it.id, it.from, it.to, it.reason, it.editable) }.asResult()
            is AppResult.Error -> result
            AppResult.Loading -> AppResult.Loading
        }

    override suspend fun updateClosure(id: String, from: LocalDate, to: LocalDate, reason: String): AppResult<Closure> =
        when (val result = safeApiCall {
            api.updateClosure(id, PatchSalonHoursClosuresByIdBody(from.toString(), to.toString(), reason.trim()))
        }) {
            is AppResult.Success -> result.data.data.let { closureOf(it.id, it.from, it.to, it.reason, it.editable) }.asResult()
            is AppResult.Error -> result
            AppResult.Loading -> AppResult.Loading
        }

    override suspend fun deleteClosure(id: String): AppResult<Unit> = safeApiCall { api.deleteClosure(id) }.mapSuccess { }
}
