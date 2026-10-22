package com.bunkpulse.android.ui.logger

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.bunkpulse.android.domain.model.AttendanceRecord
import com.bunkpulse.android.domain.model.AttendanceStatus
import com.bunkpulse.android.domain.model.Subject
import com.bunkpulse.android.domain.model.WorkingDaysConfig
import com.bunkpulse.android.domain.repository.AttendanceRepository
import com.bunkpulse.android.domain.repository.ScheduleRepository
import com.bunkpulse.android.domain.repository.SubjectRepository
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.Job
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.update
import kotlinx.coroutines.launch
import java.time.LocalDate
import javax.inject.Inject

data class LoggerUiState(
    val selectedDate: String = LocalDate.now().toString(),
    val subjects: List<Subject> = emptyList(),
    val logsForDate: List<AttendanceRecord> = emptyList(),
    val schedule: WorkingDaysConfig = WorkingDaysConfig(),
    val isLoading: Boolean = false,
    val submittingSubjectId: String? = null,
    val toastMessage: String? = null
)

@HiltViewModel
class LoggerViewModel @Inject constructor(
    private val subjectRepository: SubjectRepository,
    private val attendanceRepository: AttendanceRepository,
    private val scheduleRepository: ScheduleRepository
) : ViewModel() {

    private val _uiState = MutableStateFlow(LoggerUiState())
    val uiState: StateFlow<LoggerUiState> = _uiState.asStateFlow()

    private var logsCollectorJob: Job? = null

    init {
        observeSubjectsAndSchedule()
        loadLogsForDate(_uiState.value.selectedDate)
    }

    private fun observeSubjectsAndSchedule() {
        viewModelScope.launch {
            subjectRepository.getSubjectsFlow().collect { subs ->
                _uiState.update { it.copy(subjects = subs) }
            }
        }
        viewModelScope.launch {
            scheduleRepository.getScheduleFlow().collect { sched ->
                _uiState.update { it.copy(schedule = sched) }
            }
        }
    }

    fun setDate(date: String) {
        _uiState.update { it.copy(selectedDate = date) }
        loadLogsForDate(date)
    }

    fun shiftDate(days: Long) {
        val current = LocalDate.parse(_uiState.value.selectedDate)
        val next = current.plusDays(days).toString()
        setDate(next)
    }

    private fun loadLogsForDate(date: String) {
        logsCollectorJob?.cancel()
        logsCollectorJob = viewModelScope.launch {
            attendanceRepository.refreshLogs(date)
            attendanceRepository.getLogsFlow(date).collect { logs ->
                _uiState.update { it.copy(logsForDate = logs) }
            }
        }
    }

    fun logSubject(subjectId: String, subjectName: String, status: AttendanceStatus) {
        _uiState.update { it.copy(submittingSubjectId = subjectId) }
        viewModelScope.launch {
            val date = _uiState.value.selectedDate
            val result = attendanceRepository.createOrUpdateLog(
                subjectId = subjectId,
                subjectName = subjectName,
                date = date,
                status = status
            )
            result.fold(
                onSuccess = {
                    subjectRepository.refreshSubjects()
                    _uiState.update {
                        it.copy(
                            submittingSubjectId = null,
                            toastMessage = "Marked ${status.value} for $subjectName!"
                        )
                    }
                },
                onFailure = { err ->
                    _uiState.update {
                        it.copy(
                            submittingSubjectId = null,
                            toastMessage = err.localizedMessage ?: "Failed to log attendance"
                        )
                    }
                }
            )
        }
    }

    fun markAllPresent() {
        _uiState.update { it.copy(isLoading = true) }
        viewModelScope.launch {
            val date = _uiState.value.selectedDate
            val result = attendanceRepository.batchMarkPresent(date)
            result.fold(
                onSuccess = { (_, msg) ->
                    _uiState.update { it.copy(isLoading = false, toastMessage = msg) }
                    loadLogsForDate(date)
                },
                onFailure = { err ->
                    _uiState.update {
                        it.copy(
                            isLoading = false,
                            toastMessage = err.localizedMessage ?: "Failed to batch mark"
                        )
                    }
                }
            )
        }
    }

    fun deleteLog(id: String) {
        viewModelScope.launch {
            val res = attendanceRepository.deleteLog(id)
            res.fold(
                onSuccess = {
                    subjectRepository.refreshSubjects()
                    _uiState.update { it.copy(toastMessage = "Attendance reverted.") }
                },
                onFailure = { err ->
                    _uiState.update {
                        it.copy(toastMessage = err.localizedMessage ?: "Failed to revert log")
                    }
                }
            )
        }
    }

    fun clearToast() {
        _uiState.update { it.copy(toastMessage = null) }
    }
}
