package com.bunkpulse.android.data.remote.dto

import kotlinx.serialization.Serializable

@Serializable
data class CustomHolidayDto(
    val id: String? = null,
    val name: String,
    val date: String? = null,
    val startDate: String? = null,
    val endDate: String? = null
) {
    val resolvedStart: String get() = startDate ?: date ?: ""
    val resolvedEnd: String get() = endDate ?: date ?: startDate ?: ""
    val resolvedId: String get() = id ?: "${resolvedStart}_${resolvedEnd}_${name}"
}

@Serializable
data class ScheduleDto(
    val activeDays: List<Int> = listOf(1, 2, 3, 4, 5, 6),
    val globalTarget: Int = 75,
    val customHolidays: List<CustomHolidayDto> = emptyList(),
    val campusName: String = "College Campus",
    val campusLat: Double = 0.0,
    val campusLng: Double = 0.0,
    val campusRadius: Int = 250,
    val geoAttendanceEnabled: Boolean = false
)

@Serializable
data class UpdateScheduleRequestDto(
    val activeDays: List<Int>? = null,
    val globalTarget: Int? = null,
    val customHolidays: List<CustomHolidayDto>? = null,
    val campusName: String? = null,
    val campusLat: Double? = null,
    val campusLng: Double? = null,
    val campusRadius: Int? = null,
    val geoAttendanceEnabled: Boolean? = null
)

@Serializable
data class SchedulerSyncResultDto(
    val updatedCount: Int = 0,
    val autoAbsentCount: Int = 0,
    val message: String = "",
    val date: String = ""
)

@Serializable
data class SchedulerActionResponseDto(
    val success: Boolean = true,
    val result: SchedulerSyncResultDto? = null,
    val message: String = ""
)

@Serializable
data class UserSyncSummaryDto(
    val totalCourses: Int = 0,
    val scheduledToday: Int = 0,
    val loggedToday: Int = 0,
    val unloggedToday: Int = 0
)

@Serializable
data class SchedulerStatusResponseDto(
    val active: Boolean = true,
    val scheduler: String = "",
    val configuredTime: String = "",
    val userSyncSummary: UserSyncSummaryDto? = null
)
