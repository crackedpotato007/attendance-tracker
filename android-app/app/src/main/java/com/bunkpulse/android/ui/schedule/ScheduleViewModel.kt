package com.bunkpulse.android.ui.schedule

import android.content.Context
import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.bunkpulse.android.core.location.LocationHelper
import com.bunkpulse.android.domain.model.AttendanceRecord
import com.bunkpulse.android.domain.model.AttendanceStatus
import com.bunkpulse.android.domain.model.CampusGeofence
import com.bunkpulse.android.domain.model.Subject
import com.bunkpulse.android.domain.model.WorkingDaysConfig
import com.bunkpulse.android.domain.repository.AttendanceRepository
import com.bunkpulse.android.domain.repository.ScheduleRepository
import com.bunkpulse.android.domain.repository.SubjectRepository
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.update
import kotlinx.coroutines.launch
import java.time.LocalDate
import java.time.YearMonth
import javax.inject.Inject

data class EvaluatedCourseResult(
    val code: String,
    val name: String,
    val lectureTime: String,
    val status: String, // "PRESENT", "ABSENT", "ALREADY_LOGGED", "NOT_SCHEDULED_TODAY"
    val message: String
)

data class GeofenceVerificationDialogData(
    val detectedLat: Double,
    val detectedLng: Double,
    val campusName: String,
    val campusLat: Double,
    val campusLng: Double,
    val distanceMeters: Float,
    val radiusMeters: Int,
    val isInside: Boolean,
    val evaluatedCourses: List<EvaluatedCourseResult>
)

data class ScheduleUiState(
    val config: WorkingDaysConfig = WorkingDaysConfig(),
    val currentYearMonth: YearMonth = YearMonth.now(),
    val subjects: List<Subject> = emptyList(),
    val monthlyLogs: List<AttendanceRecord> = emptyList(),
    val activeDateModal: String? = null,
    val verificationDialogData: GeofenceVerificationDialogData? = null,
    val liveDistanceMeters: Float? = null,
    val isSubmitting: Boolean = false,
    val isDetectingLocation: Boolean = false,
    val toastMessage: String? = null
)

@HiltViewModel
class ScheduleViewModel @Inject constructor(
    private val scheduleRepository: ScheduleRepository,
    private val subjectRepository: SubjectRepository,
    private val attendanceRepository: AttendanceRepository
) : ViewModel() {

    private val _uiState = MutableStateFlow(ScheduleUiState())
    val uiState: StateFlow<ScheduleUiState> = _uiState.asStateFlow()

    init {
        observeData()
        refreshAll()
    }

    private fun observeData() {
        viewModelScope.launch {
            scheduleRepository.getScheduleFlow().collect { cfg ->
                _uiState.update { it.copy(config = cfg) }
            }
        }
        viewModelScope.launch {
            subjectRepository.getSubjectsFlow().collect { subs ->
                _uiState.update { it.copy(subjects = subs) }
            }
        }
        viewModelScope.launch {
            attendanceRepository.getLogsFlow().collect { logs ->
                _uiState.update { it.copy(monthlyLogs = logs) }
            }
        }
    }

    fun refreshAll() {
        viewModelScope.launch {
            scheduleRepository.refreshSchedule()
            subjectRepository.refreshSubjects()
            attendanceRepository.refreshLogs()
        }
    }

    fun changeMonth(delta: Long) {
        _uiState.update { it.copy(currentYearMonth = it.currentYearMonth.plusMonths(delta)) }
    }

    fun toggleDay(dayIdx: Int) {
        val currentDays = _uiState.value.config.activeDays
        val updated = if (currentDays.contains(dayIdx)) {
            if (currentDays.size == 1) return
            currentDays.filter { it != dayIdx }
        } else {
            (currentDays + dayIdx).sorted()
        }
        viewModelScope.launch {
            scheduleRepository.updateWorkingDays(updated)
            _uiState.update { it.copy(toastMessage = "Schedule updated!") }
        }
    }

    fun applyPreset(days: List<Int>) {
        viewModelScope.launch {
            scheduleRepository.updateWorkingDays(days)
            _uiState.update { it.copy(toastMessage = "Preset applied!") }
        }
    }

    fun addHoliday(name: String, start: String, end: String) {
        viewModelScope.launch {
            scheduleRepository.addHoliday(name, start, end)
            _uiState.update { it.copy(toastMessage = "Added holiday $name!") }
        }
    }

    fun removeHoliday(id: String) {
        viewModelScope.launch {
            scheduleRepository.removeHoliday(id)
            _uiState.update { it.copy(toastMessage = "Holiday removed.") }
        }
    }

    fun updateCampusGeofence(
        name: String,
        latitude: Double,
        longitude: Double,
        radiusMeters: Int,
        isEnabled: Boolean
    ) {
        viewModelScope.launch {
            val geofence = CampusGeofence(
                name = name.ifBlank { "College Campus" },
                latitude = latitude,
                longitude = longitude,
                radiusMeters = radiusMeters.coerceIn(25, 5000),
                isEnabled = isEnabled
            )
            scheduleRepository.updateCampusGeofence(geofence)
            _uiState.update {
                it.copy(
                    config = it.config.copy(campusGeofence = geofence),
                    toastMessage = "Campus Geofence saved! 📍"
                )
            }
        }
    }

    fun useCurrentLocationAsCampus(context: Context) {
        viewModelScope.launch {
            if (!LocationHelper.hasLocationPermission(context)) {
                _uiState.update { it.copy(toastMessage = "Location permission is required to capture campus coordinates.") }
                return@launch
            }
            _uiState.update { it.copy(isDetectingLocation = true, toastMessage = "Acquiring GPS fix...") }
            val loc = LocationHelper.getCurrentLocation(context)
            _uiState.update { it.copy(isDetectingLocation = false) }

            if (loc != null) {
                val currentCfg = _uiState.value.config.campusGeofence
                val updated = CampusGeofence(
                    name = currentCfg.name,
                    latitude = loc.latitude,
                    longitude = loc.longitude,
                    radiusMeters = currentCfg.radiusMeters,
                    isEnabled = true
                )
                scheduleRepository.updateCampusGeofence(updated)
                _uiState.update {
                    it.copy(
                        config = it.config.copy(campusGeofence = updated),
                        liveDistanceMeters = 0.0f,
                        toastMessage = "Campus GPS pinned: ${loc.latitude.toString().take(8)}, ${loc.longitude.toString().take(8)} 🎯"
                    )
                }
            } else {
                _uiState.update { it.copy(toastMessage = "Could not get GPS fix. Please ensure Location is enabled.") }
            }
        }
    }

    fun measureLiveDistance(context: Context) {
        viewModelScope.launch {
            val campus = _uiState.value.config.campusGeofence
            if (!campus.isConfigured) {
                _uiState.update { it.copy(toastMessage = "Please set your Campus Latitude and Longitude first!") }
                return@launch
            }
            if (!LocationHelper.hasLocationPermission(context)) {
                _uiState.update { it.copy(toastMessage = "Location permission is required to calculate distance.") }
                return@launch
            }
            _uiState.update { it.copy(isDetectingLocation = true, toastMessage = "Reading GPS fix...") }
            val loc = LocationHelper.getCurrentLocation(context)
            _uiState.update { it.copy(isDetectingLocation = false) }

            if (loc != null) {
                val distance = LocationHelper.calculateDistanceMeters(
                    loc.latitude,
                    loc.longitude,
                    campus.latitude,
                    campus.longitude
                )
                val isInside = distance <= campus.radiusMeters
                val statusStr = if (isInside) "Inside campus (${LocationHelper.formatDistance(distance)} <= ${campus.radiusMeters}m) ✅" else "Outside campus (${LocationHelper.formatDistance(distance)} > ${campus.radiusMeters}m) ❌"
                _uiState.update {
                    it.copy(
                        liveDistanceMeters = distance,
                        toastMessage = "Radar: $statusStr"
                    )
                }
            } else {
                _uiState.update { it.copy(toastMessage = "Unable to get GPS location.") }
            }
        }
    }

    fun verifyLocationAndMarkNow(context: Context) {
        viewModelScope.launch {
            val campus = _uiState.value.config.campusGeofence
            if (!campus.isConfigured) {
                _uiState.update { it.copy(toastMessage = "Please set your Campus Latitude and Longitude first!") }
                return@launch
            }

            if (!LocationHelper.hasLocationPermission(context)) {
                _uiState.update { it.copy(toastMessage = "Location permission is required to verify your location.") }
                return@launch
            }

            _uiState.update { it.copy(isDetectingLocation = true, toastMessage = "Checking current location...") }
            val loc = LocationHelper.getCurrentLocation(context)
            _uiState.update { it.copy(isDetectingLocation = false) }

            if (loc == null) {
                _uiState.update { it.copy(toastMessage = "Unable to read current GPS location. Ensure GPS is on.") }
                return@launch
            }

            val distance = LocationHelper.calculateDistanceMeters(
                loc.latitude,
                loc.longitude,
                campus.latitude,
                campus.longitude
            )
            val isInside = distance <= campus.radiusMeters
            val todayStr = LocalDate.now().toString()
            val dayOfWeek = LocalDate.now().dayOfWeek.value % 7

            val todayLogs = _uiState.value.monthlyLogs.filter { it.date == todayStr }
            val loggedIds = todayLogs.associateBy { it.subjectId }

            val evaluatedList = mutableListOf<EvaluatedCourseResult>()

            for (sub in _uiState.value.subjects) {
                val meetsToday = sub.workingDays.contains(dayOfWeek) && (sub.startDate.isBlank() || sub.startDate <= todayStr)
                val existingLog = loggedIds[sub.id]

                if (!meetsToday) {
                    evaluatedList.add(
                        EvaluatedCourseResult(
                            code = sub.code,
                            name = sub.name,
                            lectureTime = sub.lectureTime,
                            status = "NOT_SCHEDULED_TODAY",
                            message = "No lecture scheduled today"
                        )
                    )
                } else if (existingLog != null) {
                    evaluatedList.add(
                        EvaluatedCourseResult(
                            code = sub.code,
                            name = sub.name,
                            lectureTime = sub.lectureTime,
                            status = "ALREADY_LOGGED",
                            message = "Already logged as ${existingLog.status.value.uppercase()}"
                        )
                    )
                } else {
                    val status = if (isInside) AttendanceStatus.PRESENT else AttendanceStatus.ABSENT
                    val note = if (isInside) {
                        "Auto-marked Present via Geofence Check (${LocationHelper.formatDistance(distance)} from ${campus.name})"
                    } else {
                        "Auto-marked Absent via Geofence Check (${LocationHelper.formatDistance(distance)} from ${campus.name})"
                    }
                    attendanceRepository.createOrUpdateLog(sub.id, sub.name, todayStr, status, note)

                    evaluatedList.add(
                        EvaluatedCourseResult(
                            code = sub.code,
                            name = sub.name,
                            lectureTime = sub.lectureTime,
                            status = if (isInside) "PRESENT" else "ABSENT",
                            message = if (isInside) "Marked Present (${LocationHelper.formatDistance(distance)} from campus)" else "Marked Absent (${LocationHelper.formatDistance(distance)} away)"
                        )
                    )
                }
            }

            subjectRepository.refreshSubjects()
            attendanceRepository.refreshLogs()

            val dialogData = GeofenceVerificationDialogData(
                detectedLat = loc.latitude,
                detectedLng = loc.longitude,
                campusName = campus.name,
                campusLat = campus.latitude,
                campusLng = campus.longitude,
                distanceMeters = distance,
                radiusMeters = campus.radiusMeters,
                isInside = isInside,
                evaluatedCourses = evaluatedList
            )

            _uiState.update {
                it.copy(
                    verificationDialogData = dialogData,
                    liveDistanceMeters = distance
                )
            }
        }
    }

    fun dismissVerificationDialog() {
        _uiState.update { it.copy(verificationDialogData = null) }
    }

    fun openDateModal(dateStr: String) {
        _uiState.update { it.copy(activeDateModal = dateStr) }
    }

    fun closeDateModal() {
        _uiState.update { it.copy(activeDateModal = null) }
    }

    fun logDayAttendance(subjectId: String, subjectName: String, status: AttendanceStatus) {
        val date = _uiState.value.activeDateModal ?: return
        viewModelScope.launch {
            _uiState.update { it.copy(isSubmitting = true) }
            attendanceRepository.createOrUpdateLog(subjectId, subjectName, date, status)
            subjectRepository.refreshSubjects()
            attendanceRepository.refreshLogs()
            _uiState.update { it.copy(isSubmitting = false, toastMessage = "Attendance updated for $date!") }
        }
    }

    fun deleteDayLog(logId: String) {
        viewModelScope.launch {
            attendanceRepository.deleteLog(logId)
            subjectRepository.refreshSubjects()
            attendanceRepository.refreshLogs()
            _uiState.update { it.copy(toastMessage = "Log entry reverted.") }
        }
    }

    fun clearToast() {
        _uiState.update { it.copy(toastMessage = null) }
    }
}
