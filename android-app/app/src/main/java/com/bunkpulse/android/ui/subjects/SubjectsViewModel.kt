package com.bunkpulse.android.ui.subjects

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.bunkpulse.android.core.datastore.SessionAndServerManager
import com.bunkpulse.android.domain.model.Subject
import com.bunkpulse.android.domain.model.User
import com.bunkpulse.android.domain.repository.AuthRepository
import com.bunkpulse.android.domain.repository.ScheduleRepository
import com.bunkpulse.android.domain.repository.SubjectRepository
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.flow.*
import kotlinx.coroutines.launch
import javax.inject.Inject

data class SubjectsUiState(
    val user: User? = null,
    val subjects: List<Subject> = emptyList(),
    val editingSubject: Subject? = null,
    val showAddEditSheet: Boolean = false,
    val showSettingsSheet: Boolean = false,
    val showServerConfigDialog: Boolean = false,
    val serverBaseUrl: String = SessionAndServerManager.DEFAULT_BASE_URL,
    val isLoading: Boolean = false,
    val toastMessage: String? = null
)

@HiltViewModel
class SubjectsViewModel @Inject constructor(
    private val subjectRepository: SubjectRepository,
    private val authRepository: AuthRepository,
    private val scheduleRepository: ScheduleRepository,
    private val sessionManager: SessionAndServerManager
) : ViewModel() {

    private val _uiState = MutableStateFlow(SubjectsUiState())
    val uiState: StateFlow<SubjectsUiState> = _uiState.asStateFlow()

    init {
        viewModelScope.launch {
            authRepository.getSessionUser().collect { user ->
                _uiState.update { it.copy(user = user) }
            }
        }
        viewModelScope.launch {
            subjectRepository.getSubjectsFlow().collect { subs ->
                _uiState.update { it.copy(subjects = subs) }
            }
        }
        viewModelScope.launch {
            sessionManager.baseUrlFlow.collect { url ->
                _uiState.update { it.copy(serverBaseUrl = url) }
            }
        }
        refreshSubjects()
    }

    fun refreshSubjects() {
        viewModelScope.launch {
            _uiState.update { it.copy(isLoading = true) }
            subjectRepository.refreshSubjects()
            _uiState.update { it.copy(isLoading = false) }
        }
    }

    fun openAddSheet() {
        _uiState.update { it.copy(editingSubject = null, showAddEditSheet = true) }
    }

    fun openEditSheet(subject: Subject) {
        _uiState.update { it.copy(editingSubject = subject, showAddEditSheet = true) }
    }

    fun closeAddEditSheet() {
        _uiState.update { it.copy(showAddEditSheet = false, editingSubject = null) }
    }

    fun openSettingsSheet() {
        _uiState.update { it.copy(showSettingsSheet = true) }
    }

    fun closeSettingsSheet() {
        _uiState.update { it.copy(showSettingsSheet = false) }
    }

    fun openServerConfigDialog() {
        _uiState.update { it.copy(showServerConfigDialog = true) }
    }

    fun closeServerConfigDialog() {
        _uiState.update { it.copy(showServerConfigDialog = false) }
    }

    fun updateServerUrl(url: String) {
        viewModelScope.launch {
            sessionManager.setBaseUrl(url)
        }
    }

    fun saveSubject(
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
        lectureTime: String = ""
    ) {
        viewModelScope.launch {
            _uiState.update { it.copy(isLoading = true) }
            val editSub = _uiState.value.editingSubject
            val result = if (editSub != null) {
                subjectRepository.updateSubject(
                    editSub.copy(
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
                        lectureTime = lectureTime
                    )
                )
            } else {
                subjectRepository.createSubject(
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
                    lectureTime = lectureTime
                )
            }

            result.fold(
                onSuccess = {
                    _uiState.update {
                        it.copy(
                            isLoading = false,
                            showAddEditSheet = false,
                            editingSubject = null,
                            toastMessage = "Course saved successfully! 📚"
                        )
                    }
                },
                onFailure = { err ->
                    _uiState.update {
                        it.copy(isLoading = false, toastMessage = err.localizedMessage ?: "Failed to save course")
                    }
                }
            )
        }
    }

    fun deleteSubject(id: String) {
        viewModelScope.launch {
            val result = subjectRepository.deleteSubject(id)
            result.fold(
                onSuccess = { _uiState.update { it.copy(toastMessage = "Course removed.") } },
                onFailure = { err -> _uiState.update { it.copy(toastMessage = err.localizedMessage ?: "Delete failed") } }
            )
        }
    }

    fun updateProfile(name: String, target: Int) {
        viewModelScope.launch {
            val res = authRepository.updateProfile(name, target)
            res.fold(
                onSuccess = {
                    _uiState.update { it.copy(toastMessage = "Profile updated!") }
                },
                onFailure = { err ->
                    _uiState.update {
                        it.copy(toastMessage = err.localizedMessage ?: "Failed to update profile")
                    }
                }
            )
        }
    }

    fun reconcileScheduleToday() {
        viewModelScope.launch {
            val res = scheduleRepository.reconcileScheduleToday()
            res.fold(
                onSuccess = { msg ->
                    subjectRepository.refreshSubjects()
                    _uiState.update { it.copy(toastMessage = msg) }
                },
                onFailure = { err ->
                    _uiState.update { it.copy(toastMessage = err.localizedMessage ?: "Reconcile failed") }
                }
            )
        }
    }

    fun logout(onLoggedOut: () -> Unit) {
        viewModelScope.launch {
            authRepository.logout()
            onLoggedOut()
        }
    }

    fun clearToast() {
        _uiState.update { it.copy(toastMessage = null) }
    }
}
