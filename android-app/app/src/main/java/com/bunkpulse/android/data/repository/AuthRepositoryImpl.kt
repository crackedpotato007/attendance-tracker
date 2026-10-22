package com.bunkpulse.android.data.repository

import com.bunkpulse.android.core.database.BunkPulseDatabase
import com.bunkpulse.android.core.datastore.SessionAndServerManager
import com.bunkpulse.android.core.network.ApiErrorParser
import com.bunkpulse.android.data.remote.BunkPulseApiService
import com.bunkpulse.android.data.remote.dto.LoginRequestDto
import com.bunkpulse.android.data.remote.dto.SignupRequestDto
import com.bunkpulse.android.data.remote.dto.UpdateProfileRequestDto
import com.bunkpulse.android.domain.model.User
import com.bunkpulse.android.domain.repository.AuthRepository
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.first
import javax.inject.Inject
import javax.inject.Singleton

@Singleton
class AuthRepositoryImpl @Inject constructor(
    private val api: BunkPulseApiService,
    private val sessionManager: SessionAndServerManager,
    private val db: BunkPulseDatabase
) : AuthRepository {

    override fun getSessionUser(): Flow<User?> = sessionManager.currentUserFlow

    override suspend fun getAuthToken(): String? = sessionManager.getAuthToken()

    private suspend fun clearLocalDatabase() {
        db.subjectDao().clearAll()
        db.attendanceLogDao().clearAll()
        db.scheduleDao().clearAll()
        db.pendingSyncDao().clearAll()
    }

    override suspend fun checkSession(): Result<User?> {
        val token = sessionManager.getAuthToken()
        if (token.isNullOrBlank()) {
            return Result.success(null)
        }
        return try {
            val response = api.getMe()
            if (response.isSuccessful && response.body()?.user != null) {
                val u = response.body()!!.user!!
                val user = User(id = u.id, email = u.email, name = u.name, targetAttendance = u.targetAttendance)
                sessionManager.saveUser(user)
                Result.success(user)
            } else {
                sessionManager.clearSession()
                clearLocalDatabase()
                Result.success(null)
            }
        } catch (e: Exception) {
            // Offline fallback: return locally cached session user
            val cachedUser = sessionManager.currentUserFlow.first()
            Result.success(cachedUser)
        }
    }

    override suspend fun login(email: String, pass: String): Result<User> {
        return try {
            val response = api.login(LoginRequestDto(email = email, password = pass))
            if (response.isSuccessful && response.body()?.user != null) {
                val body = response.body()!!
                val u = body.user!!
                val user = User(id = u.id, email = u.email, name = u.name, targetAttendance = u.targetAttendance)
                clearLocalDatabase()
                body.token?.let { sessionManager.saveAuthToken(it) }
                sessionManager.saveUser(user)
                Result.success(user)
            } else {
                Result.failure(ApiErrorParser.parseError(response.errorBody(), "Invalid email or password."))
            }
        } catch (e: Exception) {
            Result.failure(e)
        }
    }

    override suspend fun signup(name: String, email: String, pass: String, targetAttendance: Int): Result<User> {
        return try {
            val response = api.signup(SignupRequestDto(name = name, email = email, password = pass, targetAttendance = targetAttendance))
            if (response.isSuccessful && response.body()?.user != null) {
                val body = response.body()!!
                val u = body.user!!
                val user = User(id = u.id, email = u.email, name = u.name, targetAttendance = u.targetAttendance)
                clearLocalDatabase()
                body.token?.let { sessionManager.saveAuthToken(it) }
                sessionManager.saveUser(user)
                Result.success(user)
            } else {
                Result.failure(ApiErrorParser.parseError(response.errorBody(), "Failed to create account."))
            }
        } catch (e: Exception) {
            Result.failure(e)
        }
    }

    override suspend fun updateProfile(name: String?, targetAttendance: Int?): Result<User> {
        return try {
            val response = api.updateProfile(UpdateProfileRequestDto(name = name, targetAttendance = targetAttendance))
            if (response.isSuccessful && response.body()?.user != null) {
                val u = response.body()!!.user!!
                val user = User(id = u.id, email = u.email, name = u.name, targetAttendance = u.targetAttendance)
                sessionManager.saveUser(user)
                Result.success(user)
            } else {
                Result.failure(ApiErrorParser.parseError(response.errorBody(), "Failed to update profile."))
            }
        } catch (e: Exception) {
            Result.failure(e)
        }
    }

    override suspend fun logout(): Result<Unit> {
        try {
            api.logout()
        } catch (_: Exception) {}
        sessionManager.clearSession()
        clearLocalDatabase()
        return Result.success(Unit)
    }
}
