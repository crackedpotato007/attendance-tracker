package com.bunkpulse.android.domain.repository

import com.bunkpulse.android.domain.model.Subject
import kotlinx.coroutines.flow.Flow

interface SubjectRepository {
    fun getSubjectsFlow(): Flow<List<Subject>>
    suspend fun refreshSubjects(): Result<List<Subject>>
    suspend fun createSubject(
        code: String,
        name: String,
        faculty: String = "",
        room: String = "",
        color: String = "#6366f1",
        targetPercentage: Int = 75,
        attended: Int = 0,
        total: Int = 0,
        workingDays: List<Int> = listOf(1, 2, 3, 4, 5, 6),
        startDate: String = "",
        lectureTime: String = ""
    ): Result<Subject>
    suspend fun updateSubject(subject: Subject): Result<Subject>
    suspend fun deleteSubject(id: String): Result<Unit>
    suspend fun quickLog(id: String, action: String): Result<Pair<Subject, String>>
}
