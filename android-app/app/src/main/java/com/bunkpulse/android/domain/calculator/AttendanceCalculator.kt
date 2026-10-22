package com.bunkpulse.android.domain.calculator

import com.bunkpulse.android.domain.model.BunkHealthStatus
import com.bunkpulse.android.domain.model.OverallStats
import com.bunkpulse.android.domain.model.Subject
import com.bunkpulse.android.domain.model.SubjectStats
import kotlin.math.ceil
import kotlin.math.floor
import kotlin.math.max
import kotlin.math.roundToInt

object AttendanceCalculator {

    fun round1Dec(value: Double): Float {
        if (!value.isFinite()) return 0.0f
        return (value * 10.0).roundToInt() / 10.0f
    }

    /**
     * Calculates single subject percentage, safe bunks, needed classes, and health status
     */
    fun calculateSubjectStats(
        attended: Int,
        total: Int,
        targetPercentage: Int = 75
    ): SubjectStats {
        if (total <= 0) {
            return SubjectStats(
                percentage = 0.0f,
                safeBunks = 0,
                neededClasses = 0,
                status = BunkHealthStatus.SAFE,
                missed = 0
            )
        }

        val safeTarget = targetPercentage.coerceIn(1, 100)
        val clampedAttended = attended.coerceIn(0, total)
        val percentage = (clampedAttended.toDouble() / total.toDouble()) * 100.0
        val missed = max(0, total - clampedAttended)
        val targetFraction = safeTarget.toDouble() / 100.0

        return if (percentage >= safeTarget) {
            val safe = floor((clampedAttended - targetFraction * total) / targetFraction).toInt()
            SubjectStats(
                percentage = round1Dec(percentage),
                safeBunks = max(0, safe),
                neededClasses = 0,
                status = if (percentage >= safeTarget + 5.0 || safeTarget == 100) BunkHealthStatus.SAFE else BunkHealthStatus.WARNING,
                missed = missed
            )
        } else {
            val needed = if (safeTarget >= 100) {
                // If target is 100% and a class was already missed, use practical 99% recovery bound
                ceil((0.99 * total - clampedAttended) / 0.01).toInt()
            } else {
                ceil((targetFraction * total - clampedAttended) / (1.0 - targetFraction)).toInt()
            }
            SubjectStats(
                percentage = round1Dec(percentage),
                safeBunks = 0,
                neededClasses = max(1, needed),
                status = if (percentage < 65.0) BunkHealthStatus.CRITICAL else BunkHealthStatus.WARNING,
                missed = missed
            )
        }
    }

    /**
     * Calculates overall semester telemetry across all enrolled courses
     */
    fun calculateOverallStats(
        subjects: List<Subject>,
        globalTarget: Int = 75
    ): OverallStats {
        if (subjects.isEmpty()) {
            return OverallStats(
                totalAttended = 0,
                totalClasses = 0,
                totalMissed = 0,
                overallPercentage = 0.0f,
                dangerCount = 0,
                warningCount = 0,
                totalSafeBunks = 0,
                totalNeeded = 0,
                isAboveTarget = true
            )
        }

        var totalAttended = 0
        var totalClasses = 0
        var dangerCount = 0
        var warningCount = 0
        var totalSafeBunks = 0
        var totalNeeded = 0
        val safeGlobalTarget = if (globalTarget > 0) globalTarget.coerceIn(1, 100) else 75

        subjects.forEach { sub ->
            totalAttended += sub.attended
            totalClasses += sub.total
            val stats = calculateSubjectStats(
                attended = sub.attended,
                total = sub.total,
                targetPercentage = if (sub.targetPercentage > 0) sub.targetPercentage else safeGlobalTarget
            )
            when (stats.status) {
                BunkHealthStatus.CRITICAL -> dangerCount++
                BunkHealthStatus.WARNING -> warningCount++
                BunkHealthStatus.SAFE -> Unit
            }
            totalSafeBunks += stats.safeBunks
            totalNeeded += stats.neededClasses
        }

        val overallPercentage = if (totalClasses > 0) {
            (totalAttended.toDouble() / totalClasses.toDouble()) * 100.0
        } else {
            0.0
        }

        return OverallStats(
            totalAttended = totalAttended,
            totalClasses = totalClasses,
            totalMissed = max(0, totalClasses - totalAttended),
            overallPercentage = round1Dec(overallPercentage),
            dangerCount = dangerCount,
            warningCount = warningCount,
            totalSafeBunks = totalSafeBunks,
            totalNeeded = totalNeeded,
            isAboveTarget = overallPercentage >= safeGlobalTarget
        )
    }

    /**
     * What-If Simulator for single course
     */
    fun simulateSingleSubject(
        subject: Subject,
        simBunk: Int,
        simAttend: Int
    ): Float {
        val projectedAttended = subject.attended + simAttend
        val projectedTotal = max(1, subject.total + simBunk + simAttend)
        return round1Dec((projectedAttended.toDouble() / projectedTotal.toDouble()) * 100.0)
    }

    /**
     * Multi-day leave projection for a course
     */
    fun simulateLeaveCourse(
        subject: Subject,
        daysOff: Int,
        classesPerDay: Int
    ): Float {
        val missedInLeave = daysOff * classesPerDay
        val newTotal = max(1, subject.total + missedInLeave)
        return round1Dec((subject.attended.toDouble() / newTotal.toDouble()) * 100.0)
    }
}
