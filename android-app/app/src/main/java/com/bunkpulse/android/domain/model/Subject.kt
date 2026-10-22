package com.bunkpulse.android.domain.model

data class Subject(
    val id: String,
    val code: String,
    val name: String,
    val faculty: String = "",
    val room: String = "",
    val color: String = "#6366f1",
    val targetPercentage: Int = 75,
    val attended: Int = 0,
    val total: Int = 0,
    val workingDays: List<Int> = listOf(1, 2, 3, 4, 5, 6),
    val startDate: String = "",
    val lastAutoIncrementDate: String = "",
    val lectureTime: String = "", // e.g. "09:30" (24h)
    val createdAt: String? = null,
    val updatedAt: String? = null
)
