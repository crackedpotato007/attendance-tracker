package com.bunkpulse.android.ui.auth

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.bunkpulse.android.core.datastore.SessionAndServerManager
import com.bunkpulse.android.domain.model.User
import com.bunkpulse.android.domain.repository.AuthRepository
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch
import javax.inject.Inject

data class AuthUiState(
    val isSignUp: Boolean = false,
    val name: String = "",
    val email: String = "",
    val password: String = "",
    val targetAttendance: Int = 75,
    val isLoading: Boolean = false,
    val errorMessage: String? = null,
    val isSuccess: Boolean = false,
    val serverBaseUrl: String = SessionAndServerManager.DEFAULT_BASE_URL,
    val showServerDialog: Boolean = false
)

@HiltViewModel
class AuthViewModel @Inject constructor(
    private val authRepository: AuthRepository,
    private val sessionManager: SessionAndServerManager
) : ViewModel() {

    private val _uiState = MutableStateFlow(AuthUiState())
    val uiState: StateFlow<AuthUiState> = _uiState.asStateFlow()

    init {
        viewModelScope.launch {
            sessionManager.baseUrlFlow.collect { url ->
                _uiState.value = _uiState.value.copy(serverBaseUrl = url)
            }
        }
    }

    fun setMode(isSignUp: Boolean) {
        _uiState.value = _uiState.value.copy(isSignUp = isSignUp, errorMessage = null)
    }

    fun onNameChange(name: String) { _uiState.value = _uiState.value.copy(name = name) }
    fun onEmailChange(email: String) { _uiState.value = _uiState.value.copy(email = email) }
    fun onPasswordChange(pass: String) { _uiState.value = _uiState.value.copy(password = pass) }
    fun onTargetChange(target: Int) { _uiState.value = _uiState.value.copy(targetAttendance = target) }

    fun openServerDialog() { _uiState.value = _uiState.value.copy(showServerDialog = true) }
    fun closeServerDialog() { _uiState.value = _uiState.value.copy(showServerDialog = false) }

    fun updateServerUrl(url: String) {
        viewModelScope.launch {
            sessionManager.setBaseUrl(url)
        }
    }

    fun submit() {
        val state = _uiState.value
        _uiState.value = state.copy(isLoading = true, errorMessage = null)

        viewModelScope.launch {
            val result = if (state.isSignUp) {
                if (state.name.isBlank()) {
                    _uiState.value = state.copy(isLoading = false, errorMessage = "Please provide your name.")
                    return@launch
                }
                authRepository.signup(state.name, state.email, state.password, state.targetAttendance)
            } else {
                authRepository.login(state.email, state.password)
            }

            result.fold(
                onSuccess = {
                    _uiState.value = _uiState.value.copy(isLoading = false, isSuccess = true)
                },
                onFailure = { err ->
                    _uiState.value = _uiState.value.copy(isLoading = false, errorMessage = err.localizedMessage ?: "Authentication failed")
                }
            )
        }
    }
}
