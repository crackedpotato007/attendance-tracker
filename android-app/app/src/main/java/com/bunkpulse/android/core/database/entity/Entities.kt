package com.bunkpulse.android.core.database.entity

import androidx.room.Entity
import androidx.room.PrimaryKey
import com.bunkpulse.android.domain.model.AttendanceRecord
import com.bunkpulse.android.domain.model.AttendanceStatus
import com.bunkpulse.android.domain.model.CampusGeofence
import com.bunkpulse.android.domain.model.CustomHoliday
import com.bunkpulse.android.domain.model.Subject
import com.bunkpulse.android.domain.model.WorkingDaysConfig

@Entity(tableName = "subjects")
data class SubjectEntity(
    @PrimaryKey val id: String,
    val code: String,
    val name: String,
    val faculty: String,
    val room: String,
    val color: String,
    val targetPercentage: Int,
    val attended: Int,
    val total: Int,
    val workingDays: List<Int>,
    val startDate: String,
    val lastAutoIncrementDate: String,
    val lectureTime: String = "",
    val createdAt: String?,
    val updatedAt: String?
) {
    fun toDomain(): Subject = Subject(
        id = id,
        code = code,
        name = name,
        faculty = faculty,
        room = room,
        color = color,
        targetPercentage = targetPercentage,
        attended = attended,
        total = total,
        workingDays = workingDays,
        startDate = startDate,
        lastAutoIncrementDate = lastAutoIncrementDate,
        lectureTime = lectureTime,
        createdAt = createdAt,
        updatedAt = updatedAt
    )

    companion object {
        fun fromDomain(s: Subject): SubjectEntity = SubjectEntity(
            id = s.id,
            code = s.code,
            name = s.name,
            faculty = s.faculty,
            room = s.room,
            color = s.color,
            targetPercentage = s.targetPercentage,
            attended = s.attended,
            total = s.total,
            workingDays = s.workingDays,
            startDate = s.startDate,
            lastAutoIncrementDate = s.lastAutoIncrementDate,
            lectureTime = s.lectureTime,
            createdAt = s.createdAt,
            updatedAt = s.updatedAt
        )
    }
}

@Entity(tableName = "attendance_logs")
data class AttendanceLogEntity(
    @PrimaryKey val id: String,
    val subjectId: String,
    val subjectName: String,
    val date: String,
    val status: String,
    val note: String,
    val createdAt: String?
) {
    fun toDomain(): AttendanceRecord = AttendanceRecord(
        id = id,
        subjectId = subjectId,
        subjectName = subjectName,
        date = date,
        status = AttendanceStatus.fromValue(status),
        note = note,
        createdAt = createdAt
    )

    companion object {
        fun fromDomain(r: AttendanceRecord): AttendanceLogEntity = AttendanceLogEntity(
            id = r.id,
            subjectId = r.subjectId,
            subjectName = r.subjectName,
            date = r.date,
            status = r.status.value,
            note = r.note,
            createdAt = r.createdAt
        )
    }
}

@Entity(tableName = "user_schedule")
data class ScheduleEntity(
    @PrimaryKey val id: Int = 1,
    val activeDays: List<Int>,
    val globalTarget: Int,
    val customHolidays: List<CustomHoliday>,
    val campusName: String = "College Campus",
    val campusLatitude: Double = 0.0,
    val campusLongitude: Double = 0.0,
    val campusRadiusMeters: Int = 250,
    val geofenceEnabled: Boolean = false
) {
    fun toDomain(): WorkingDaysConfig = WorkingDaysConfig(
        activeDays = activeDays,
        globalTarget = globalTarget,
        customHolidays = customHolidays,
        campusGeofence = CampusGeofence(
            name = campusName,
            latitude = campusLatitude,
            longitude = campusLongitude,
            radiusMeters = campusRadiusMeters,
            isEnabled = geofenceEnabled
        )
    )
}

@Entity(tableName = "pending_sync_actions")
data class PendingSyncEntity(
    @PrimaryKey(autoGenerate = true) val actionId: Long = 0,
    val actionType: String, // "LOG_ATTENDANCE" | "QUICK_LOG" | "BATCH_PRESENT"
    val payloadJson: String,
    val timestamp: Long = System.currentTimeMillis()
)
