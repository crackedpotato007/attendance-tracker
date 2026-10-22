package com.bunkpulse.android.data.repository

import com.bunkpulse.android.core.database.dao.AttendanceLogDao
import com.bunkpulse.android.core.database.dao.SubjectDao
import com.bunkpulse.android.core.database.entity.AttendanceLogEntity
import com.bunkpulse.android.core.database.entity.SubjectEntity
import com.bunkpulse.android.core.network.ApiErrorParser
import com.bunkpulse.android.data.remote.BunkPulseApiService
import com.bunkpulse.android.data.remote.dto.AttendanceLogRequestDto
import com.bunkpulse.android.data.remote.dto.BatchAttendanceRequestDto
import com.bunkpulse.android.domain.model.AttendanceRecord
import com.bunkpulse.android.domain.model.AttendanceStatus
import com.bunkpulse.android.domain.model.Subject
import com.bunkpulse.android.domain.repository.AttendanceRepository
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.map
import javax.inject.Inject
import javax.inject.Singleton

@Singleton
class AttendanceRepositoryImpl @Inject constructor(
    private val api: BunkPulseApiService,
    private val attendanceLogDao: AttendanceLogDao,
    private val subjectDao: SubjectDao
) : AttendanceRepository {

    override fun getLogsFlow(date: String?): Flow<List<AttendanceRecord>> {
        val flow = if (date.isNullOrBlank()) {
            attendanceLogDao.getAllLogsFlow()
        } else {
            attendanceLogDao.getLogsByDateFlow(date)
        }
        return flow.map { entities -> entities.map { it.toDomain() } }
    }

    override suspend fun refreshLogs(date: String?): Result<List<AttendanceRecord>> {
        return try {
            val response = api.getAttendance(date)
            if (response.isSuccessful && response.body() != null) {
                val records = response.body()!!.map { dto ->
                    AttendanceRecord(
                        id = dto.resolvedId,
                        subjectId = dto.subjectId,
                        subjectName = dto.subjectName,
                        date = dto.date,
                        status = AttendanceStatus.fromValue(dto.status),
                        note = dto.note,
                        createdAt = dto.createdAt
                    )
                }
                val entities = records.map { AttendanceLogEntity.fromDomain(it) }
                if (date.isNullOrBlank()) {
                    attendanceLogDao.replaceAllLogs(entities)
                } else {
                    attendanceLogDao.replaceLogsForDate(date, entities)
                }
                Result.success(records)
            } else {
                Result.failure(ApiErrorParser.parseError(response.errorBody(), "Failed to fetch logs."))
            }
        } catch (e: Exception) {
            Result.failure(e)
        }
    }

    override suspend fun createOrUpdateLog(
        subjectId: String,
        subjectName: String,
        date: String,
        status: AttendanceStatus,
        note: String
    ): Result<AttendanceRecord> {
        return try {
            val request = AttendanceLogRequestDto(
                subjectId = subjectId,
                subjectName = subjectName,
                date = date,
                status = status.value,
                note = note
            )
            val response = api.createAttendance(request)
            if (response.isSuccessful && response.body() != null) {
                val body = response.body()!!
                val record = AttendanceRecord(
                    id = body.log.resolvedId,
                    subjectId = body.log.subjectId,
                    subjectName = body.log.subjectName,
                    date = body.log.date,
                    status = AttendanceStatus.fromValue(body.log.status),
                    note = body.log.note,
                    createdAt = body.log.createdAt
                )
                attendanceLogDao.insertLog(AttendanceLogEntity.fromDomain(record))

                // Also update subject locally if returned
                body.subject?.let { dto ->
                    val sub = Subject(
                        id = dto.id,
                        code = dto.code,
                        name = dto.name,
                        faculty = dto.faculty.ifBlank { dto.professor },
                        room = dto.room,
                        color = dto.color,
                        targetPercentage = dto.targetPercentage,
                        attended = dto.attended,
                        total = dto.total,
                        workingDays = dto.workingDays,
                        startDate = dto.startDate,
                        lastAutoIncrementDate = dto.lastAutoIncrementDate,
                        createdAt = dto.createdAt,
                        updatedAt = dto.updatedAt
                    )
                    subjectDao.insertSubject(SubjectEntity.fromDomain(sub))
                }

                Result.success(record)
            } else {
                Result.failure(ApiErrorParser.parseError(response.errorBody(), "Failed to record attendance."))
            }
        } catch (e: Exception) {
            Result.failure(e)
        }
    }

    override suspend fun batchMarkPresent(date: String): Result<Pair<List<AttendanceRecord>, String>> {
        return try {
            val response = api.batchAttendance(BatchAttendanceRequestDto(date = date))
            if (response.isSuccessful && response.body() != null) {
                val body = response.body()!!
                val records = body.logs.map { dto ->
                    AttendanceRecord(
                        id = dto.resolvedId,
                        subjectId = dto.subjectId,
                        subjectName = dto.subjectName,
                        date = dto.date,
                        status = AttendanceStatus.fromValue(dto.status),
                        note = dto.note,
                        createdAt = dto.createdAt
                    )
                }
                attendanceLogDao.insertLogs(records.map { AttendanceLogEntity.fromDomain(it) })

                // Update updated subjects
                val subjects = body.subjects.map { dto ->
                    Subject(
                        id = dto.id,
                        code = dto.code,
                        name = dto.name,
                        faculty = dto.faculty.ifBlank { dto.professor },
                        room = dto.room,
                        color = dto.color,
                        targetPercentage = dto.targetPercentage,
                        attended = dto.attended,
                        total = dto.total,
                        workingDays = dto.workingDays,
                        startDate = dto.startDate,
                        lastAutoIncrementDate = dto.lastAutoIncrementDate,
                        createdAt = dto.createdAt,
                        updatedAt = dto.updatedAt
                    )
                }
                subjectDao.insertSubjects(subjects.map { SubjectEntity.fromDomain(it) })

                Result.success(Pair(records, body.message))
            } else {
                Result.failure(ApiErrorParser.parseError(response.errorBody(), "Failed to batch mark present."))
            }
        } catch (e: Exception) {
            Result.failure(e)
        }
    }

    override suspend fun deleteLog(id: String): Result<Unit> {
        return try {
            val response = api.deleteAttendance(id)
            if (response.isSuccessful) {
                attendanceLogDao.deleteLogById(id)
                Result.success(Unit)
            } else {
                Result.failure(ApiErrorParser.parseError(response.errorBody(), "Failed to revert attendance log."))
            }
        } catch (e: Exception) {
            Result.failure(e)
        }
    }
}
