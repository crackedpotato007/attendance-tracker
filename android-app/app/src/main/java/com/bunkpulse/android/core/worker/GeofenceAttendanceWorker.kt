package com.bunkpulse.android.core.worker

import android.app.NotificationChannel
import android.app.NotificationManager
import android.content.Context
import android.os.Build
import androidx.core.app.NotificationCompat
import androidx.hilt.work.HiltWorker
import androidx.work.CoroutineWorker
import androidx.work.WorkerParameters
import com.bunkpulse.android.core.database.dao.AttendanceLogDao
import com.bunkpulse.android.core.database.dao.ScheduleDao
import com.bunkpulse.android.core.database.dao.SubjectDao
import com.bunkpulse.android.core.datastore.SessionAndServerManager
import com.bunkpulse.android.core.location.LocationHelper
import com.bunkpulse.android.domain.model.AttendanceStatus
import com.bunkpulse.android.domain.repository.AttendanceRepository
import dagger.assisted.Assisted
import dagger.assisted.AssistedInject
import kotlinx.coroutines.flow.first
import java.time.LocalDate
import java.time.LocalTime

data class GeofenceCheckResult(
    val success: Boolean,
    val isInside: Boolean,
    val distanceMeters: Float,
    val radiusMeters: Int,
    val campusName: String,
    val markedPresentCount: Int,
    val markedAbsentCount: Int,
    val message: String
)

@HiltWorker
class GeofenceAttendanceWorker @AssistedInject constructor(
    @Assisted private val appContext: Context,
    @Assisted workerParams: WorkerParameters,
    private val sessionManager: SessionAndServerManager,
    private val subjectDao: SubjectDao,
    private val attendanceLogDao: AttendanceLogDao,
    private val scheduleDao: ScheduleDao,
    private val attendanceRepository: AttendanceRepository
) : CoroutineWorker(appContext, workerParams) {

    companion object {
        const val CHANNEL_ID = "bunkpulse_geofence_attendance"
        const val NOTIFICATION_ID_BASE = 2000

        fun createNotificationChannel(context: Context) {
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                val name = "BunkPulse Geofence Attendance"
                val descriptionText = "Automated location-based attendance updates for scheduled lectures"
                val importance = NotificationManager.IMPORTANCE_HIGH
                val channel = NotificationChannel(CHANNEL_ID, name, importance).apply {
                    description = descriptionText
                }
                val notificationManager =
                    context.getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager
                notificationManager.createNotificationChannel(channel)
            }
        }
    }

    override suspend fun doWork(): Result {
        val token = sessionManager.getAuthToken()
        if (token.isNullOrBlank()) return Result.success()

        val campus = sessionManager.getCampusGeofence()
        if (!campus.isEnabled || !campus.isConfigured) return Result.success()

        if (!LocationHelper.hasLocationPermission(appContext)) {
            return Result.success()
        }

        val location = LocationHelper.getCurrentLocation(appContext) ?: return Result.retry()
        val distance = LocationHelper.calculateDistanceMeters(
            location.latitude,
            location.longitude,
            campus.latitude,
            campus.longitude
        )
        val isInside = distance <= campus.radiusMeters

        val today = LocalDate.now()
        val todayStr = today.toString()
        val dayOfWeek = today.dayOfWeek.value % 7

        // Check holiday
        val sched = scheduleDao.getScheduleFlow().first()
        val isHoliday = sched?.customHolidays?.any { it.isInHoliday(todayStr) } == true
        if (isHoliday) return Result.success()

        val subjects = subjectDao.getAllSubjectsFlow().first()
        val todayLogs = attendanceLogDao.getLogsByDateFlow(todayStr).first()
        val loggedSubjectIds = todayLogs.map { it.subjectId }.toSet()

        val now = LocalTime.now()
        val nowMinutes = now.hour * 60 + now.minute

        var notifIdOffset = 1
        createNotificationChannel(appContext)
        val notificationManager =
            appContext.getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager

        for (sub in subjects) {
            if (loggedSubjectIds.contains(sub.id)) continue
            if (!sub.workingDays.contains(dayOfWeek)) continue
            if (sub.startDate.isNotBlank() && sub.startDate > todayStr) continue
            if (sub.lectureTime.isBlank()) continue

            // Parse lecture time
            val parts = sub.lectureTime.split(":")
            val classHour = parts.getOrNull(0)?.toIntOrNull() ?: continue
            val classMin = parts.getOrNull(1)?.toIntOrNull() ?: 0
            val classMinutes = classHour * 60 + classMin

            // Check if within class evaluation window (from lecture start time up to 90 min after)
            if (nowMinutes >= classMinutes && nowMinutes <= classMinutes + 90) {
                val status = if (isInside) AttendanceStatus.PRESENT else AttendanceStatus.ABSENT
                val note = if (isInside) {
                    "Auto-marked Present via Campus Geofence (${LocationHelper.formatDistance(distance)} from ${campus.name})"
                } else {
                    "Auto-marked Absent via Campus Geofence (${LocationHelper.formatDistance(distance)} from ${campus.name})"
                }

                attendanceRepository.createOrUpdateLog(
                    subjectId = sub.id,
                    subjectName = sub.name,
                    date = todayStr,
                    status = status,
                    note = note
                )

                // Dispatch notification to user
                val notifTitle = if (isInside) {
                    "📍 Auto-Marked Present • ${sub.code}"
                } else {
                    "📍 Auto-Marked Absent • ${sub.code}"
                }
                val notifBody = "${sub.name}: ${if (isInside) "Within" else "Outside"} ${campus.name} (${LocationHelper.formatDistance(distance)} vs ${campus.radiusMeters}m radius)"

                val notification = NotificationCompat.Builder(appContext, CHANNEL_ID)
                    .setSmallIcon(android.R.drawable.ic_dialog_map)
                    .setContentTitle(notifTitle)
                    .setContentText(notifBody)
                    .setPriority(NotificationCompat.PRIORITY_HIGH)
                    .setAutoCancel(true)
                    .build()

                notificationManager.notify(NOTIFICATION_ID_BASE + notifIdOffset++, notification)
            }
        }

        return Result.success()
    }
}
