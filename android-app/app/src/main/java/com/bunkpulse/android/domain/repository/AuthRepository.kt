package com.bunkpulse.android.domain.repository

import com.bunkpulse.android.domain.model.User
import kotlinx.coroutines.flow.Flow

interface AuthRepository {
    fun getSessionUser(): Flow<User?>
    suspend fun checkSession(): Result<User?>
    suspend fun login(email: String, pass: String): Result<User>
    suspend fun signup(name: String, email: String, pass: String, targetAttendance: Int = 75): Result<User>
    suspend fun updateProfile(name: String?, targetAttendance: Int?): Result<User>
    suspend fun logout(): Result<Unit>
    suspend fun getAuthToken(): String?
}
