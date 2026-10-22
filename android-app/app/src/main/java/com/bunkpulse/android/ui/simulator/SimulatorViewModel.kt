package com.bunkpulse.android.ui.simulator

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.bunkpulse.android.domain.model.Subject
import com.bunkpulse.android.domain.repository.ScheduleRepository
import com.bunkpulse.android.domain.repository.SubjectRepository
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.update
import kotlinx.coroutines.launch
import javax.inject.Inject

data class SimulatorUiState(
    val subjects: List<Subject> = emptyList(),
    val targetGoal: Int = 75,
    val selectedSubjectId: String = "",
    val simBunkClasses: Int = 2,
    val simAttendClasses: Int = 0,
    val vacationDaysOff: Int = 4,
    val classesPerDay: Int = 1
)

@HiltViewModel
class SimulatorViewModel @Inject constructor(
    private val subjectRepository: SubjectRepository,
    private val scheduleRepository: ScheduleRepository
) : ViewModel() {

    private val _uiState = MutableStateFlow(SimulatorUiState())
    val uiState: StateFlow<SimulatorUiState> = _uiState.asStateFlow()

    init {
        viewModelScope.launch {
            subjectRepository.getSubjectsFlow().collect { subs ->
                _uiState.update { state ->
                    val selectedId = if (state.selectedSubjectId.isBlank() && subs.isNotEmpty()) {
                        subs.first().id
                    } else {
                        state.selectedSubjectId
                    }
                    state.copy(subjects = subs, selectedSubjectId = selectedId)
                }
            }
        }
        viewModelScope.launch {
            scheduleRepository.getScheduleFlow().collect { sched ->
                _uiState.update { it.copy(targetGoal = sched.globalTarget) }
            }
        }
    }

    fun setTargetGoal(target: Int) {
        _uiState.update { it.copy(targetGoal = target) }
    }

    fun selectSubject(id: String) {
        _uiState.update { it.copy(selectedSubjectId = id) }
    }

    fun changeBunk(delta: Int) {
        _uiState.update { it.copy(simBunkClasses = (it.simBunkClasses + delta).coerceAtLeast(0)) }
    }

    fun changeAttend(delta: Int) {
        _uiState.update { it.copy(simAttendClasses = (it.simAttendClasses + delta).coerceAtLeast(0)) }
    }

    fun setVacationDays(days: Int) {
        _uiState.update { it.copy(vacationDaysOff = days.coerceAtLeast(1)) }
    }

    fun setClassesPerDay(count: Int) {
        _uiState.update { it.copy(classesPerDay = count.coerceIn(1, 4)) }
    }
}
