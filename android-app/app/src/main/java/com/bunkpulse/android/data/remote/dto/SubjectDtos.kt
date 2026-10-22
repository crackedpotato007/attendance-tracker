package com.bunkpulse.android.data.remote.dto

import kotlinx.serialization.Serializable

@Serializable
data class SubjectDto(
    val id: String,
    val code: String,
    val name: String,
    val faculty: String = "",
    val professor: String = "",
    val room: String = "",
    val color: String = "#6366f1",
    val targetPercentage: Int = 75,
    val attended: Int = 0,
    val total: Int = 0,
    val workingDays: List<Int> = listOf(1, 2, 3, 4, 5, 6),
    val startDate: String = "",
    val lastAutoIncrementDate: String = "",
    val lectureTime: String = "",
    val createdAt: String? = null,
    val updatedAt: String? = null
)

@Serializable
data class SubjectRequestDto(
    val code: String,
    val name: String,
    val faculty: String = "",
    val professor: String = "",
    val room: String = "",
    val color: String = "#6366f1",
    val targetPercentage: Int = 75,
    val attended: Int = 0,
    val total: Int = 0,
    val workingDays: List<Int> = listOf(1, 2, 3, 4, 5, 6),
    val startDate: String = "",
    val lectureTime: String = ""
)

@Serializable
data class QuickLogRequestDto(
    val action: String // "present" | "absent"
)

@Serializable
data class QuickLogResponseDto(
    val subject: SubjectDto? = null,
    val log: AttendanceLogDto? = null,
    val alreadyLogged: Boolean = false,
    val message: String? = null
)
