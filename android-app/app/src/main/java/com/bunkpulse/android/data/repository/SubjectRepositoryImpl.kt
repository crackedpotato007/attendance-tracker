package com.bunkpulse.android.data.repository

import com.bunkpulse.android.core.database.dao.AttendanceLogDao
import com.bunkpulse.android.core.database.dao.SubjectDao
import com.bunkpulse.android.core.database.entity.AttendanceLogEntity
import com.bunkpulse.android.core.database.entity.SubjectEntity
import com.bunkpulse.android.core.network.ApiErrorParser
import com.bunkpulse.android.data.remote.BunkPulseApiService
import com.bunkpulse.android.data.remote.dto.QuickLogRequestDto
import com.bunkpulse.android.data.remote.dto.SubjectRequestDto
import com.bunkpulse.android.domain.model.AttendanceRecord
import com.bunkpulse.android.domain.model.AttendanceStatus
import com.bunkpulse.android.domain.model.Subject
import com.bunkpulse.android.domain.repository.SubjectRepository
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.map
import javax.inject.Inject
import javax.inject.Singleton

@Singleton
class SubjectRepositoryImpl @Inject constructor(
    private val api: BunkPulseApiService,
    private val subjectDao: SubjectDao,
    private val attendanceLogDao: AttendanceLogDao
) : SubjectRepository {

    override fun getSubjectsFlow(): Flow<List<Subject>> {
        return subjectDao.getAllSubjectsFlow().map { entities ->
            entities.map { it.toDomain() }
        }
    }

    override suspend fun refreshSubjects(): Result<List<Subject>> {
        return try {
            val response = api.getSubjects()
            if (response.isSuccessful && response.body() != null) {
                val subjects = response.body()!!.map { dto ->
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
                        lectureTime = dto.lectureTime,
                        createdAt = dto.createdAt,
                        updatedAt = dto.updatedAt
                    )
                }
                subjectDao.replaceAllSubjects(subjects.map { SubjectEntity.fromDomain(it) })
                Result.success(subjects)
            } else {
                Result.failure(ApiErrorParser.parseError(response.errorBody(), "Failed to fetch subjects."))
            }
        } catch (e: Exception) {
            Result.failure(e)
        }
    }

    override suspend fun createSubject(
        code: String,
        name: String,
        faculty: String,
        room: String,
        color: String,
        targetPercentage: Int,
        attended: Int,
        total: Int,
        workingDays: List<Int>,
        startDate: String,
        lectureTime: String
    ): Result<Subject> {
        return try {
            val request = SubjectRequestDto(
                code = code,
                name = name,
                faculty = faculty,
                professor = faculty,
                room = room,
                color = color,
                targetPercentage = targetPercentage,
                attended = attended,
                total = total,
                workingDays = workingDays,
                startDate = startDate,
                lectureTime = lectureTime
            )
            val response = api.createSubject(request)
            if (response.isSuccessful && response.body() != null) {
                val dto = response.body()!!
                val created = Subject(
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
                    lectureTime = dto.lectureTime,
                    createdAt = dto.createdAt,
                    updatedAt = dto.updatedAt
                )
                subjectDao.insertSubject(SubjectEntity.fromDomain(created))
                Result.success(created)
            } else {
                Result.failure(ApiErrorParser.parseError(response.errorBody(), "Failed to create subject."))
            }
        } catch (e: Exception) {
            Result.failure(e)
        }
    }

    override suspend fun updateSubject(subject: Subject): Result<Subject> {
        return try {
            val request = SubjectRequestDto(
                code = subject.code,
                name = subject.name,
                faculty = subject.faculty,
                professor = subject.faculty,
                room = subject.room,
                color = subject.color,
                targetPercentage = subject.targetPercentage,
                attended = subject.attended,
                total = subject.total,
                workingDays = subject.workingDays,
                startDate = subject.startDate,
                lectureTime = subject.lectureTime
            )
            val response = api.updateSubject(subject.id, request)
            if (response.isSuccessful && response.body() != null) {
                val dto = response.body()!!
                val updated = Subject(
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
                    lectureTime = dto.lectureTime,
                    createdAt = dto.createdAt,
                    updatedAt = dto.updatedAt
                )
                subjectDao.insertSubject(SubjectEntity.fromDomain(updated))
                Result.success(updated)
            } else {
                Result.failure(ApiErrorParser.parseError(response.errorBody(), "Failed to update subject."))
            }
        } catch (e: Exception) {
            Result.failure(e)
        }
    }

    override suspend fun deleteSubject(id: String): Result<Unit> {
        return try {
            val response = api.deleteSubject(id)
            if (response.isSuccessful) {
                subjectDao.deleteSubjectById(id)
                attendanceLogDao.deleteLogsForSubject(id)
                Result.success(Unit)
            } else {
                Result.failure(ApiErrorParser.parseError(response.errorBody(), "Failed to delete subject."))
            }
        } catch (e: Exception) {
            Result.failure(e)
        }
    }

    override suspend fun quickLog(id: String, action: String): Result<Pair<Subject, String>> {
        return try {
            val response = api.quickLog(id, QuickLogRequestDto(action = action))
            if (response.isSuccessful && response.body() != null) {
                val body = response.body()!!
                val msg = body.message ?: "Logged $action successfully!"
                body.log?.let { logDto ->
                    val record = AttendanceRecord(
                        id = logDto.resolvedId,
                        subjectId = logDto.subjectId,
                        subjectName = logDto.subjectName,
                        date = logDto.date,
                        status = AttendanceStatus.fromValue(logDto.status),
                        note = logDto.note,
                        createdAt = logDto.createdAt
                    )
                    attendanceLogDao.insertLog(AttendanceLogEntity.fromDomain(record))
                }
                if (body.subject != null) {
                    val dto = body.subject
                    val updated = Subject(
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
                        lectureTime = dto.lectureTime,
                        createdAt = dto.createdAt,
                        updatedAt = dto.updatedAt
                    )
                    subjectDao.insertSubject(SubjectEntity.fromDomain(updated))
                    Result.success(Pair(updated, msg))
                } else {
                    refreshSubjects()
                    val sub = subjectDao.getSubjectById(id)?.toDomain()
                    if (sub != null) Result.success(Pair(sub, msg))
                    else Result.failure(Exception("Subject not found"))
                }
            } else {
                Result.failure(ApiErrorParser.parseError(response.errorBody(), "Failed to log attendance."))
            }
        } catch (e: Exception) {
            Result.failure(e)
        }
    }
}
