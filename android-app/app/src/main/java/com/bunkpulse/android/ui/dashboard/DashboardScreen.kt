package com.bunkpulse.android.ui.dashboard

import android.widget.Toast
import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.font.FontFamily
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.bunkpulse.android.core.designsystem.components.AttendanceProgressBar
import com.bunkpulse.android.core.designsystem.components.GlassCard
import com.bunkpulse.android.core.designsystem.components.StatusBadge
import com.bunkpulse.android.core.designsystem.theme.*
import com.bunkpulse.android.domain.calculator.AttendanceCalculator
import com.bunkpulse.android.domain.model.BunkHealthStatus
import com.bunkpulse.android.domain.model.Subject
import nl.dionsegijn.konfetti.compose.KonfettiView
import nl.dionsegijn.konfetti.core.Party
import nl.dionsegijn.konfetti.core.Position
import nl.dionsegijn.konfetti.core.emitter.Emitter
import java.util.concurrent.TimeUnit

@Composable
fun DashboardScreen(
    viewModel: HomeViewModel,
    onNavigateToLogger: () -> Unit,
    onNavigateToSimulator: () -> Unit,
    onNavigateToCalendar: () -> Unit
) {
    val uiState by viewModel.uiState.collectAsState()
    val context = LocalContext.current

    LaunchedEffect(uiState.toastMessage) {
        uiState.toastMessage?.let {
            Toast.makeText(context, it, Toast.LENGTH_SHORT).show()
            viewModel.clearToast()
        }
    }

    Box(modifier = Modifier.fillMaxSize().background(BgMain)) {
        LazyColumn(
            modifier = Modifier.fillMaxSize(),
            contentPadding = PaddingValues(16.dp),
            verticalArrangement = Arrangement.spacedBy(16.dp)
        ) {
            // 1. Hero Cockpit Card
            item {
                GlassCard(modifier = Modifier.fillMaxWidth(), backgroundColor = BgSurface) {
                    Column(modifier = Modifier.padding(20.dp)) {
                        Row(
                            verticalAlignment = Alignment.CenterVertically,
                            horizontalArrangement = Arrangement.spacedBy(6.dp)
                        ) {
                            Icon(Icons.Default.School, contentDescription = null, tint = AccentIndigo, modifier = Modifier.size(16.dp))
                            Text("BunkPulse • MongoDB Synced", color = TextSecondary, fontSize = 12.sp, fontWeight = FontWeight.SemiBold)
                        }
                        Spacer(modifier = Modifier.height(8.dp))
                        Text(
                            text = "Hello, ${uiState.user?.name ?: "Student"} 🎓",
                            style = Typography.headlineMedium,
                            fontWeight = FontWeight.Bold,
                            color = TextPrimary
                        )
                        Spacer(modifier = Modifier.height(4.dp))
                        Text(
                            text = "Overall Attendance: ${uiState.overallStats.overallPercentage}% (Target: ${uiState.schedule.globalTarget}%)",
                            style = Typography.bodyMedium,
                            color = if (uiState.overallStats.isAboveTarget) SafeEmerald else CriticalRose
                        )

                        Spacer(modifier = Modifier.height(16.dp))

                        Row(horizontalArrangement = Arrangement.spacedBy(10.dp)) {
                            Button(
                                onClick = onNavigateToLogger,
                                shape = RoundedCornerShape(10.dp),
                                colors = ButtonDefaults.buttonColors(containerColor = AccentIndigo),
                                modifier = Modifier.weight(1f)
                            ) {
                                Icon(Icons.Default.CheckCircle, contentDescription = null, modifier = Modifier.size(16.dp))
                                Spacer(modifier = Modifier.width(6.dp))
                                Text("Log Today")
                            }

                            OutlinedButton(
                                onClick = onNavigateToSimulator,
                                shape = RoundedCornerShape(10.dp),
                                colors = ButtonDefaults.outlinedButtonColors(contentColor = AccentCyan),
                                modifier = Modifier.weight(1f)
                            ) {
                                Icon(Icons.Default.Calculate, contentDescription = null, modifier = Modifier.size(16.dp))
                                Spacer(modifier = Modifier.width(6.dp))
                                Text("Simulator")
                            }
                        }
                    }
                }
            }

            // 2. Urgent Attention Alert (if any course is critical)
            val criticalSubjects = uiState.subjects.filter {
                val stats = AttendanceCalculator.calculateSubjectStats(it.attended, it.total, it.targetPercentage)
                stats.neededClasses > 0
            }
            if (criticalSubjects.isNotEmpty()) {
                item {
                    GlassCard(
                        modifier = Modifier.fillMaxWidth(),
                        backgroundColor = CriticalRose.copy(alpha = 0.12f),
                        borderColor = CriticalRose.copy(alpha = 0.35f)
                    ) {
                        Row(
                            modifier = Modifier.padding(14.dp),
                            verticalAlignment = Alignment.CenterVertically,
                            horizontalArrangement = Arrangement.spacedBy(12.dp)
                        ) {
                            Icon(Icons.Default.Warning, contentDescription = null, tint = CriticalRose, modifier = Modifier.size(24.dp))
                            Column(modifier = Modifier.weight(1f)) {
                                Text(
                                    "Low Attendance in ${criticalSubjects.size} ${if (criticalSubjects.size == 1) "Course" else "Courses"}!",
                                    fontWeight = FontWeight.Bold,
                                    fontSize = 13.sp,
                                    color = Color.White
                                )
                                Text(
                                    "${criticalSubjects.first().name}: Attend next ${
                                        AttendanceCalculator.calculateSubjectStats(
                                            criticalSubjects.first().attended,
                                            criticalSubjects.first().total,
                                            criticalSubjects.first().targetPercentage
                                        ).neededClasses
                                    } consecutive lectures to recover.",
                                    fontSize = 11.sp,
                                    color = TextSecondary
                                )
                            }
                            TextButton(onClick = onNavigateToSimulator) {
                                Text("Plan ➜", color = WarningAmber, fontSize = 12.sp, fontWeight = FontWeight.Bold)
                            }
                        }
                    }
                }
            }

            // 3. 2x2 KPI Grid
            item {
                Column(verticalArrangement = Arrangement.spacedBy(10.dp)) {
                    Row(horizontalArrangement = Arrangement.spacedBy(10.dp), modifier = Modifier.fillMaxWidth()) {
                        KpiCard(
                            title = "Overall Attendance",
                            value = "${uiState.overallStats.overallPercentage}%",
                            subtitle = "${uiState.overallStats.totalAttended} / ${uiState.overallStats.totalClasses} Conducted",
                            valueColor = if (uiState.overallStats.isAboveTarget) SafeEmerald else CriticalRose,
                            icon = Icons.Default.EmojiEvents,
                            iconColor = if (uiState.overallStats.isAboveTarget) SafeEmerald else CriticalRose,
                            modifier = Modifier.weight(1f)
                        )
                        KpiCard(
                            title = "Safe Bunks Left",
                            value = "${uiState.overallStats.totalSafeBunks} Bunks",
                            subtitle = "Across safe courses",
                            valueColor = WarningAmber,
                            icon = Icons.Default.LocalFireDepartment,
                            iconColor = WarningAmber,
                            modifier = Modifier.weight(1f)
                        )
                    }

                    Row(horizontalArrangement = Arrangement.spacedBy(10.dp), modifier = Modifier.fillMaxWidth()) {
                        KpiCard(
                            title = "Catch-Up Classes",
                            value = "${uiState.overallStats.totalNeeded} Classes",
                            subtitle = "To reach ${uiState.schedule.globalTarget}% target",
                            valueColor = AccentCyan,
                            icon = Icons.Default.TrendingUp,
                            iconColor = AccentCyan,
                            modifier = Modifier.weight(1f)
                        )
                        KpiCard(
                            title = "Schedule",
                            value = "${uiState.schedule.activeDays.size} Days/Wk",
                            subtitle = "Mon–Sat Active ➜",
                            valueColor = HolidayPurple,
                            icon = Icons.Default.CalendarMonth,
                            iconColor = HolidayPurple,
                            modifier = Modifier.weight(1f),
                            onClick = onNavigateToCalendar
                        )
                    }
                }
            }

            // 4. Enrolled Courses Section Header
            item {
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.SpaceBetween,
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Column {
                        Text("Enrolled Courses", style = Typography.titleLarge, color = TextPrimary)
                        Text("1-Tap live modifiers & safe bunk telemetry", style = Typography.bodyMedium, color = TextSecondary)
                    }
                    TextButton(onClick = onNavigateToLogger) {
                        Text("Log All ➜", color = AccentIndigo)
                    }
                }
            }

            // 5. Course Cards
            items(uiState.subjects, key = { it.id }) { sub ->
                CourseDashboardCard(
                    subject = sub,
                    targetGoal = uiState.schedule.globalTarget,
                    isSubmitting = uiState.submittingSubjectId == sub.id,
                    onQuickLog = { action -> viewModel.quickLog(sub.id, action) }
                )
            }

            // 6. Analytics Split: Doughnut / Bar Toggle
            item {
                GlassCard(modifier = Modifier.fillMaxWidth(), backgroundColor = BgSurface) {
                    Column(modifier = Modifier.padding(18.dp)) {
                        Row(
                            modifier = Modifier.fillMaxWidth(),
                            horizontalArrangement = Arrangement.SpaceBetween,
                            verticalAlignment = Alignment.CenterVertically
                        ) {
                            Text("Semester Analytics", style = Typography.titleMedium, color = TextPrimary)
                            Row(
                                modifier = Modifier
                                    .clip(RoundedCornerShape(8.dp))
                                    .background(BgInput)
                                    .padding(2.dp)
                            ) {
                                Box(
                                    modifier = Modifier
                                        .clip(RoundedCornerShape(6.dp))
                                        .background(if (uiState.chartView == ChartType.DOUGHNUT) AccentIndigo else Color.Transparent)
                                        .clickable { viewModel.setChartView(ChartType.DOUGHNUT) }
                                        .padding(horizontal = 10.dp, vertical = 4.dp)
                                ) {
                                    Text("Ratio", fontSize = 11.sp, color = Color.White, fontWeight = FontWeight.Bold)
                                }
                                Box(
                                    modifier = Modifier
                                        .clip(RoundedCornerShape(6.dp))
                                        .background(if (uiState.chartView == ChartType.BAR) AccentIndigo else Color.Transparent)
                                        .clickable { viewModel.setChartView(ChartType.BAR) }
                                        .padding(horizontal = 10.dp, vertical = 4.dp)
                                ) {
                                    Text("Comparison", fontSize = 11.sp, color = Color.White, fontWeight = FontWeight.Bold)
                                }
                            }
                        }

                        Spacer(modifier = Modifier.height(16.dp))

                        Box(modifier = Modifier.fillMaxWidth(), contentAlignment = Alignment.Center) {
                            if (uiState.chartView == ChartType.DOUGHNUT) {
                                OverallDoughnutChart(
                                    attended = uiState.overallStats.totalAttended,
                                    missed = uiState.overallStats.totalMissed
                                )
                            } else {
                                SubjectComparisonBarChart(
                                    subjects = uiState.subjects,
                                    targetGoal = uiState.schedule.globalTarget
                                )
                            }
                        }
                    }
                }
            }

            // 7. Recent Activity Feed
            item {
                Text("Recent Activity Feed", style = Typography.titleMedium, color = TextPrimary)
            }

            items(uiState.logs.take(5), key = { it.id }) { log ->
                GlassCard(modifier = Modifier.fillMaxWidth(), backgroundColor = BgSurface) {
                    Row(
                        modifier = Modifier.padding(12.dp),
                        verticalAlignment = Alignment.CenterVertically,
                        horizontalArrangement = Arrangement.SpaceBetween
                    ) {
                        Row(
                            verticalAlignment = Alignment.CenterVertically,
                            horizontalArrangement = Arrangement.spacedBy(10.dp)
                        ) {
                            StatusBadge(
                                text = log.status.value.uppercase(),
                                color = when (log.status.value) {
                                    "present" -> SafeEmerald
                                    "absent" -> CriticalRose
                                    else -> AccentIndigo
                                }
                            )
                            Column {
                                Text(log.subjectName, color = TextPrimary, fontWeight = FontWeight.Bold, fontSize = 13.sp)
                                Text(log.date, color = TextSecondary, fontSize = 11.sp, fontFamily = FontFamily.Monospace)
                            }
                        }
                        IconButton(onClick = { viewModel.deleteLog(log.id) }) {
                            Icon(Icons.Default.Close, contentDescription = "Revert", tint = TextMuted, modifier = Modifier.size(16.dp))
                        }
                    }
                }
            }
        }

        // Konfetti Celebration Overlay on Present
        if (uiState.triggerConfetti) {
            val party = remember {
                Party(
                    speed = 0f,
                    maxSpeed = 30f,
                    damping = 0.9f,
                    spread = 360,
                    colors = listOf(0x6366F1, 0x10B981, 0x06B6D4, 0xF59E0B),
                    emitter = Emitter(duration = 200, TimeUnit.MILLISECONDS).max(100),
                    position = Position.Relative(0.5, 0.4)
                )
            }
            KonfettiView(
                parties = listOf(party),
                modifier = Modifier.fillMaxSize()
            )
        }
    }
}

@Composable
private fun KpiCard(
    title: String,
    value: String,
    subtitle: String,
    valueColor: Color,
    icon: androidx.compose.ui.graphics.vector.ImageVector,
    iconColor: Color,
    modifier: Modifier = Modifier,
    onClick: (() -> Unit)? = null
) {
    GlassCard(
        modifier = modifier.then(if (onClick != null) Modifier.clickable { onClick() } else Modifier),
        backgroundColor = BgSurface
    ) {
        Column(modifier = Modifier.padding(14.dp)) {
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically
            ) {
                Text(title, color = TextSecondary, fontSize = 11.sp, fontWeight = FontWeight.Medium)
                Icon(icon, contentDescription = null, tint = iconColor, modifier = Modifier.size(16.dp))
            }
            Spacer(modifier = Modifier.height(6.dp))
            Text(value, color = valueColor, fontSize = 20.sp, fontWeight = FontWeight.Bold, fontFamily = FontFamily.Monospace)
            Spacer(modifier = Modifier.height(2.dp))
            Text(subtitle, color = TextMuted, fontSize = 10.sp)
        }
    }
}

@Composable
private fun CourseDashboardCard(
    subject: Subject,
    targetGoal: Int,
    isSubmitting: Boolean,
    onQuickLog: (String) -> Unit
) {
    val stats = AttendanceCalculator.calculateSubjectStats(subject.attended, subject.total, subject.targetPercentage)
    val isSafe = stats.status != BunkHealthStatus.CRITICAL

    GlassCard(modifier = Modifier.fillMaxWidth(), backgroundColor = BgSurface) {
        Column(modifier = Modifier.padding(16.dp)) {
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically
            ) {
                Row(
                    verticalAlignment = Alignment.CenterVertically,
                    horizontalArrangement = Arrangement.spacedBy(8.dp)
                ) {
                    Box(
                        modifier = Modifier
                            .size(10.dp)
                            .clip(CircleShape)
                            .background(Color(android.graphics.Color.parseColor(subject.color.ifBlank { "#6366f1" })))
                    )
                    Text(subject.code, color = TextPrimary, fontWeight = FontWeight.Bold, fontFamily = FontFamily.Monospace)
                    if (subject.lectureTime.isNotBlank()) {
                        StatusBadge(
                            text = "⏰ ${subject.lectureTime}",
                            color = AccentCyan
                        )
                    }
                }
                StatusBadge(
                    text = "${stats.percentage}%",
                    color = if (isSafe) SafeEmerald else CriticalRose
                )
            }

            Spacer(modifier = Modifier.height(6.dp))
            Text(subject.name, style = Typography.titleMedium, color = TextPrimary)
            Text(
                "${subject.faculty.ifBlank { "Faculty" }} • ${subject.room.ifBlank { "Campus" }}",
                color = TextSecondary,
                fontSize = 11.sp
            )

            Spacer(modifier = Modifier.height(10.dp))
            AttendanceProgressBar(percentage = stats.percentage, targetPercentage = subject.targetPercentage)

            Spacer(modifier = Modifier.height(6.dp))
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween
            ) {
                Text("${subject.attended} attended", color = TextSecondary, fontSize = 11.sp)
                Text("${stats.missed} missed (of ${subject.total})", color = TextSecondary, fontSize = 11.sp)
            }

            Spacer(modifier = Modifier.height(10.dp))

            // Bunk / Catch up box
            Box(
                modifier = Modifier
                    .fillMaxWidth()
                    .background(
                        if (isSafe) SafeEmerald.copy(alpha = 0.1f) else CriticalRose.copy(alpha = 0.1f),
                        RoundedCornerShape(8.dp)
                    )
                    .padding(horizontal = 10.dp, vertical = 6.dp)
            ) {
                Row(
                    verticalAlignment = Alignment.CenterVertically,
                    horizontalArrangement = Arrangement.spacedBy(6.dp)
                ) {
                    Icon(
                        if (isSafe) Icons.Default.LocalFireDepartment else Icons.Default.Warning,
                        contentDescription = null,
                        tint = if (isSafe) SafeEmerald else CriticalRose,
                        modifier = Modifier.size(14.dp)
                    )
                    Text(
                        text = if (isSafe) {
                            "Can bunk ${stats.safeBunks} more classes!"
                        } else {
                            "Attend next ${stats.neededClasses} classes to recover!"
                        },
                        fontSize = 11.sp,
                        fontWeight = FontWeight.SemiBold,
                        color = if (isSafe) SafeEmerald else CriticalRose
                    )
                }
            }

            Spacer(modifier = Modifier.height(12.dp))

            // 1-Tap Quick Action Buttons
            Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                Button(
                    onClick = { onQuickLog("present") },
                    enabled = !isSubmitting,
                    shape = RoundedCornerShape(8.dp),
                    colors = ButtonDefaults.buttonColors(containerColor = SafeEmerald),
                    modifier = Modifier.weight(1f).height(38.dp)
                ) {
                    Icon(Icons.Default.Add, contentDescription = null, modifier = Modifier.size(14.dp))
                    Spacer(modifier = Modifier.width(4.dp))
                    Text("Present", fontSize = 12.sp, fontWeight = FontWeight.Bold)
                }

                Button(
                    onClick = { onQuickLog("absent") },
                    enabled = !isSubmitting,
                    shape = RoundedCornerShape(8.dp),
                    colors = ButtonDefaults.buttonColors(containerColor = CriticalRose),
                    modifier = Modifier.weight(1f).height(38.dp)
                ) {
                    Icon(Icons.Default.Remove, contentDescription = null, modifier = Modifier.size(14.dp))
                    Spacer(modifier = Modifier.width(4.dp))
                    Text("Absent", fontSize = 12.sp, fontWeight = FontWeight.Bold)
                }
            }
        }
    }
}
