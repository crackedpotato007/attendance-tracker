package com.bunkpulse.android.data.remote

import com.bunkpulse.android.data.remote.dto.*
import retrofit2.Response
import retrofit2.http.*

interface BunkPulseApiService {

    // Auth
    @POST("auth/signup")
    suspend fun signup(@Body request: SignupRequestDto): Response<AuthResponseDto>

    @POST("auth/login")
    suspend fun login(@Body request: LoginRequestDto): Response<AuthResponseDto>

    @GET("auth/me")
    suspend fun getMe(): Response<SessionResponseDto>

    @PUT("auth/me")
    suspend fun updateProfile(@Body request: UpdateProfileRequestDto): Response<AuthResponseDto>

    @POST("auth/logout")
    suspend fun logout(): Response<MessageResponseDto>

    // Subjects
    @GET("subjects")
    suspend fun getSubjects(): Response<List<SubjectDto>>

    @POST("subjects")
    suspend fun createSubject(@Body request: SubjectRequestDto): Response<SubjectDto>

    @PUT("subjects/{id}")
    suspend fun updateSubject(
        @Path("id") id: String,
        @Body request: SubjectRequestDto
    ): Response<SubjectDto>

    @DELETE("subjects/{id}")
    suspend fun deleteSubject(@Path("id") id: String): Response<MessageResponseDto>

    @POST("subjects/{id}/quick")
    suspend fun quickLog(
        @Path("id") id: String,
        @Body request: QuickLogRequestDto
    ): Response<QuickLogResponseDto>

    // Attendance
    @GET("attendance")
    suspend fun getAttendance(
        @Query("date") date: String? = null
    ): Response<List<AttendanceLogDto>>

    @POST("attendance")
    suspend fun createAttendance(
        @Body request: AttendanceLogRequestDto
    ): Response<AttendanceLogResponseDto>

    @POST("attendance/batch")
    suspend fun batchAttendance(
        @Body request: BatchAttendanceRequestDto
    ): Response<BatchAttendanceResponseDto>

    @DELETE("attendance/{id}")
    suspend fun deleteAttendance(@Path("id") id: String): Response<MessageResponseDto>

    // Schedule
    @GET("schedule")
    suspend fun getSchedule(): Response<ScheduleDto>

    @PUT("schedule")
    suspend fun updateSchedule(
        @Body request: UpdateScheduleRequestDto
    ): Response<ScheduleDto>

    // Scheduler (Scoped to current user)
    @GET("scheduler/status")
    suspend fun getSchedulerStatus(): Response<SchedulerStatusResponseDto>

    @POST("scheduler/run-now")
    suspend fun reconcileScheduleNow(): Response<SchedulerActionResponseDto>

    @POST("scheduler/run-auto-absent")
    suspend fun runAutoAbsentNow(): Response<SchedulerActionResponseDto>
}
