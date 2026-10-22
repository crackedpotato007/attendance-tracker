package com.bunkpulse.android.core.database.dao

import androidx.room.*
import com.bunkpulse.android.core.database.entity.AttendanceLogEntity
import com.bunkpulse.android.core.database.entity.PendingSyncEntity
import com.bunkpulse.android.core.database.entity.ScheduleEntity
import com.bunkpulse.android.core.database.entity.SubjectEntity
import kotlinx.coroutines.flow.Flow

@Dao
interface SubjectDao {
    @Query("SELECT * FROM subjects ORDER BY name ASC")
    fun getAllSubjectsFlow(): Flow<List<SubjectEntity>>

    @Query("SELECT * FROM subjects WHERE id = :id LIMIT 1")
    suspend fun getSubjectById(id: String): SubjectEntity?

    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun insertSubjects(subjects: List<SubjectEntity>)

    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun insertSubject(subject: SubjectEntity)

    @Query("DELETE FROM subjects WHERE id = :id")
    suspend fun deleteSubjectById(id: String)

    @Query("DELETE FROM subjects")
    suspend fun clearAll()

    @Transaction
    suspend fun replaceAllSubjects(subjects: List<SubjectEntity>) {
        clearAll()
        insertSubjects(subjects)
    }
}

@Dao
interface AttendanceLogDao {
    @Query("SELECT * FROM attendance_logs ORDER BY date DESC, createdAt DESC")
    fun getAllLogsFlow(): Flow<List<AttendanceLogEntity>>

    @Query("SELECT * FROM attendance_logs WHERE date = :date ORDER BY createdAt DESC")
    fun getLogsByDateFlow(date: String): Flow<List<AttendanceLogEntity>>

    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun insertLogs(logs: List<AttendanceLogEntity>)

    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun insertLog(log: AttendanceLogEntity)

    @Query("DELETE FROM attendance_logs WHERE id = :id")
    suspend fun deleteLogById(id: String)

    @Query("DELETE FROM attendance_logs WHERE date = :date")
    suspend fun deleteLogsByDate(date: String)

    @Query("DELETE FROM attendance_logs WHERE subjectId = :subjectId")
    suspend fun deleteLogsForSubject(subjectId: String)

    @Query("DELETE FROM attendance_logs")
    suspend fun clearAll()

    @Transaction
    suspend fun replaceAllLogs(logs: List<AttendanceLogEntity>) {
        clearAll()
        insertLogs(logs)
    }

    @Transaction
    suspend fun replaceLogsForDate(date: String, logs: List<AttendanceLogEntity>) {
        deleteLogsByDate(date)
        insertLogs(logs)
    }
}

@Dao
interface ScheduleDao {
    @Query("SELECT * FROM user_schedule WHERE id = 1 LIMIT 1")
    fun getScheduleFlow(): Flow<ScheduleEntity?>

    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun insertSchedule(schedule: ScheduleEntity)

    @Query("DELETE FROM user_schedule")
    suspend fun clearAll()
}

@Dao
interface PendingSyncDao {
    @Query("SELECT * FROM pending_sync_actions ORDER BY actionId ASC")
    suspend fun getAllPendingActions(): List<PendingSyncEntity>

    @Insert
    suspend fun insertAction(action: PendingSyncEntity)

    @Delete
    suspend fun deleteAction(action: PendingSyncEntity)

    @Query("DELETE FROM pending_sync_actions")
    suspend fun clearAll()
}
