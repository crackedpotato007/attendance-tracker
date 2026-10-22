package com.bunkpulse.android.ui.dashboard

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.bunkpulse.android.domain.calculator.AttendanceCalculator
import com.bunkpulse.android.domain.model.*
import com.bunkpulse.android.domain.repository.AttendanceRepository
import com.bunkpulse.android.domain.repository.AuthRepository
import com.bunkpulse.android.domain.repository.ScheduleRepository
import com.bunkpulse.android.domain.repository.SubjectRepository
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.flow.*
import kotlinx.coroutines.launch
import javax.inject.Inject

data class HomeUiState(
    val user: User? = null,
    val subjects: List<Subject> = emptyList(),
    val logs: List<AttendanceRecord> = emptyList(),
    val schedule: WorkingDaysConfig = WorkingDaysConfig(),
    val overallStats: OverallStats = OverallStats(0, 0, 0, 0f, 0, 0, 0, 0, true),
    val chartView: ChartType = ChartType.DOUGHNUT,
    val isLoading: Boolean = false,
    val toastMessage: String? = null,
    val triggerConfetti: Boolean = false,
    val submittingSubjectId: String? = null
)

enum class ChartType {
    DOUGHNUT,
    BAR
}

@HiltViewModel
class HomeViewModel @Inject constructor(
    private val authRepository: AuthRepository,
    private val subjectRepository: SubjectRepository,
    private val attendanceRepository: AttendanceRepository,
    private val scheduleRepository: ScheduleRepository
) : ViewModel() {

    private val _uiState = MutableStateFlow(HomeUiState())
    val uiState: StateFlow<HomeUiState> = _uiState.asStateFlow()

    init {
        observeData()
        refreshAll()
    }

    private fun observeData() {
        viewModelScope.launch {
            authRepository.getSessionUser().collect { user ->
                _uiState.update { it.copy(user = user) }
            }
        }
        viewModelScope.launch {
            subjectRepository.getSubjectsFlow().collect { subs ->
                val stats = AttendanceCalculator.calculateOverallStats(subs, _uiState.value.schedule.globalTarget)
                _uiState.update { it.copy(subjects = subs, overallStats = stats) }
            }
        }
        viewModelScope.launch {
            attendanceRepository.getLogsFlow().collect { logs ->
                _uiState.update { it.copy(logs = logs) }
            }
        }
        viewModelScope.launch {
            scheduleRepository.getScheduleFlow().collect { sched ->
                val stats = AttendanceCalculator.calculateOverallStats(_uiState.value.subjects, sched.globalTarget)
                _uiState.update { it.copy(schedule = sched, overallStats = stats) }
            }
        }
    }

    fun refreshAll() {
        viewModelScope.launch {
            _uiState.update { it.copy(isLoading = true) }
            subjectRepository.refreshSubjects()
            attendanceRepository.refreshLogs()
            scheduleRepository.refreshSchedule()
            _uiState.update { it.copy(isLoading = false) }
        }
    }

    fun setChartView(chartType: ChartType) {
        _uiState.update { it.copy(chartView = chartType) }
    }

    fun quickLog(subjectId: String, action: String) {
        _uiState.update { it.copy(submittingSubjectId = subjectId) }
        viewModelScope.launch {
            val result = subjectRepository.quickLog(subjectId, action)
            result.fold(
                onSuccess = { (_, message) ->
                    val showConfetti = action == "present"
                    _uiState.update {
                        it.copy(
                            submittingSubjectId = null,
                            toastMessage = message,
                            triggerConfetti = showConfetti
                        )
                    }
                    attendanceRepository.refreshLogs()
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

    fun deleteLog(logId: String) {
        viewModelScope.launch {
            attendanceRepository.deleteLog(logId)
            subjectRepository.refreshSubjects()
            _uiState.update { it.copy(toastMessage = "Attendance entry reverted.") }
        }
    }

    fun clearToast() {
        _uiState.update { it.copy(toastMessage = null, triggerConfetti = false) }
    }
}
