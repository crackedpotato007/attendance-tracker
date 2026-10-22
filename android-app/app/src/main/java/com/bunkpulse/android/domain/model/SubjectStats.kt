package com.bunkpulse.android.domain.model

enum class BunkHealthStatus {
    SAFE,
    WARNING,
    CRITICAL
}

data class SubjectStats(
    val percentage: Float,
    val safeBunks: Int,
    val neededClasses: Int,
    val status: BunkHealthStatus,
    val missed: Int
)

data class OverallStats(
    val totalAttended: Int,
    val totalClasses: Int,
    val totalMissed: Int,
    val overallPercentage: Float,
    val dangerCount: Int,
    val warningCount: Int,
    val totalSafeBunks: Int,
    val totalNeeded: Int,
    val isAboveTarget: Boolean
)
