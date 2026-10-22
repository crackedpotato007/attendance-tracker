package com.bunkpulse.android.data.remote.dto

import kotlinx.serialization.SerialName
import kotlinx.serialization.Serializable

@Serializable
data class AttendanceLogDto(
    @SerialName("id") val id: String? = null,
    @SerialName("_id") val mongoId: String? = null,
    val subjectId: String,
    val subjectName: String,
    val date: String,
    val status: String,
    val note: String = "",
    val createdAt: String? = null
) {
    val resolvedId: String get() = id ?: mongoId ?: "${subjectId}_${date}"
}

@Serializable
data class AttendanceLogRequestDto(
    val subjectId: String,
    val subjectName: String,
    val date: String,
    val status: String,
    val note: String = ""
)

@Serializable
data class AttendanceLogResponseDto(
    val log: AttendanceLogDto,
    val subject: SubjectDto? = null,
    val alreadyLogged: Boolean = false,
    val message: String? = null
)

@Serializable
data class BatchAttendanceRequestDto(
    val date: String
)

@Serializable
data class BatchAttendanceResponseDto(
    val message: String,
    val logs: List<AttendanceLogDto> = emptyList(),
    val subjects: List<SubjectDto> = emptyList()
)
