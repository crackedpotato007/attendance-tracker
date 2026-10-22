package com.bunkpulse.android.domain.model

data class AttendanceRecord(
    val id: String,
    val subjectId: String,
    val subjectName: String,
    val date: String, // YYYY-MM-DD
    val status: AttendanceStatus,
    val note: String = "",
    val createdAt: String? = null
)

enum class AttendanceStatus(val value: String) {
    PRESENT("present"),
    ABSENT("absent"),
    CANCELLED("cancelled");

    companion object {
        fun fromValue(value: String): AttendanceStatus {
            return entries.find { it.value.equals(value, ignoreCase = true) } ?: PRESENT
        }
    }
}
