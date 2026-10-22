package com.bunkpulse.android.domain.repository

import com.bunkpulse.android.domain.model.AttendanceRecord
import com.bunkpulse.android.domain.model.AttendanceStatus
import kotlinx.coroutines.flow.Flow

interface AttendanceRepository {
    fun getLogsFlow(date: String? = null): Flow<List<AttendanceRecord>>
    suspend fun refreshLogs(date: String? = null): Result<List<AttendanceRecord>>
    suspend fun createOrUpdateLog(
        subjectId: String,
        subjectName: String,
        date: String,
        status: AttendanceStatus,
        note: String = ""
    ): Result<AttendanceRecord>
    suspend fun batchMarkPresent(date: String): Result<Pair<List<AttendanceRecord>, String>>
    suspend fun deleteLog(id: String): Result<Unit>
}
