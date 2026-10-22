package com.bunkpulse.android.domain.calculator

import com.bunkpulse.android.domain.model.BunkHealthStatus
import com.bunkpulse.android.domain.model.Subject
import org.junit.Assert.assertEquals
import org.junit.Assert.assertTrue
import org.junit.Test

class AttendanceCalculatorTest {

    @Test
    fun testSubjectStats_safeWithBunks() {
        // Attended 18 out of 20 = 90% (target 75%)
        val stats = AttendanceCalculator.calculateSubjectStats(18, 20, 75)
        assertEquals(90.0f, stats.percentage, 0.01f)
        assertEquals(4, stats.safeBunks)
        assertEquals(0, stats.neededClasses)
        assertEquals(BunkHealthStatus.SAFE, stats.status)
        assertEquals(2, stats.missed)
    }

    @Test
    fun testSubjectStats_criticalNeedsCatchUp() {
        // Attended 10 out of 20 = 50% (target 75%)
        val stats = AttendanceCalculator.calculateSubjectStats(10, 20, 75)
        assertEquals(50.0f, stats.percentage, 0.01f)
        assertEquals(0, stats.safeBunks)
        assertEquals(20, stats.neededClasses) // Needs 20 consecutive classes: (10 + 20) / (20 + 20) = 30 / 40 = 75%
        assertEquals(BunkHealthStatus.CRITICAL, stats.status)
        assertEquals(10, stats.missed)
    }

    @Test
    fun testSubjectStats_zeroAndHundredTargetEdgeCases() {
        // Target = 0 should clamp safely to 1% and never divide by zero
        val zeroTargetStats = AttendanceCalculator.calculateSubjectStats(10, 20, 0)
        assertTrue(zeroTargetStats.safeBunks < 10000)

        // Target = 100 with missed classes should not divide by zero
        val hundredTargetStats = AttendanceCalculator.calculateSubjectStats(9, 10, 100)
        assertTrue(hundredTargetStats.neededClasses in 1..10000)
    }

    @Test
    fun testOverallStats() {
        val s1 = Subject(id = "1", code = "CS101", name = "Math", attended = 18, total = 20, targetPercentage = 75)
        val s2 = Subject(id = "2", code = "CS102", name = "Physics", attended = 10, total = 20, targetPercentage = 75)
        val overall = AttendanceCalculator.calculateOverallStats(listOf(s1, s2), 75)

        assertEquals(28, overall.totalAttended)
        assertEquals(40, overall.totalClasses)
        assertEquals(12, overall.totalMissed)
        assertEquals(70.0f, overall.overallPercentage, 0.01f)
        assertEquals(1, overall.dangerCount)
        assertEquals(4, overall.totalSafeBunks)
        assertEquals(20, overall.totalNeeded)
        assertEquals(false, overall.isAboveTarget)
    }

    @Test
    fun testWhatIfSimulation() {
        val s = Subject(id = "1", code = "CS101", name = "Math", attended = 18, total = 20, targetPercentage = 75)
        // If bunking 2 classes: 18 / 22 = 81.8%
        val projected = AttendanceCalculator.simulateSingleSubject(s, simBunk = 2, simAttend = 0)
        assertEquals(81.8f, projected, 0.1f)
    }
}
