package com.bunkpulse.android.ui.logger

import android.widget.Toast
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.font.FontFamily
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.bunkpulse.android.core.designsystem.components.GlassCard
import com.bunkpulse.android.core.designsystem.components.StatusBadge
import com.bunkpulse.android.core.designsystem.theme.*
import com.bunkpulse.android.domain.calculator.AttendanceCalculator
import com.bunkpulse.android.domain.model.AttendanceStatus
import com.bunkpulse.android.domain.model.Subject
import java.time.LocalDate

@Composable
fun ManageLoggerScreen(
    viewModel: LoggerViewModel
) {
    val uiState by viewModel.uiState.collectAsState()
    val context = LocalContext.current

    LaunchedEffect(uiState.toastMessage) {
        uiState.toastMessage?.let {
            Toast.makeText(context, it, Toast.LENGTH_SHORT).show()
            viewModel.clearToast()
        }
    }

    val selectedDateObj = try { LocalDate.parse(uiState.selectedDate) } catch (_: Exception) { LocalDate.now() }
    val dayOfWeek = selectedDateObj.dayOfWeek.value % 7 // 0 = Sun, 1 = Mon ...
    val isWorkingDay = uiState.schedule.activeDays.contains(dayOfWeek)
    val dayName = selectedDateObj.dayOfWeek.name.lowercase().replaceFirstChar { it.uppercase() }

    Box(modifier = Modifier.fillMaxSize().background(BgMain)) {
        LazyColumn(
            modifier = Modifier.fillMaxSize(),
            contentPadding = PaddingValues(16.dp),
            verticalArrangement = Arrangement.spacedBy(16.dp)
        ) {
            // 1. Date Navigation Hero
            item {
                GlassCard(modifier = Modifier.fillMaxWidth(), backgroundColor = BgSurface) {
                    Column(modifier = Modifier.padding(18.dp)) {
                        Row(
                            verticalAlignment = Alignment.CenterVertically,
                            horizontalArrangement = Arrangement.spacedBy(6.dp)
                        ) {
                            Icon(Icons.Default.Event, contentDescription = null, tint = SafeEmerald, modifier = Modifier.size(16.dp))
                            Text("Daily Attendance Ledger", color = TextSecondary, fontSize = 12.sp, fontWeight = FontWeight.SemiBold)
                        }

                        Spacer(modifier = Modifier.height(10.dp))

                        Row(
                            modifier = Modifier.fillMaxWidth(),
                            verticalAlignment = Alignment.CenterVertically,
                            horizontalArrangement = Arrangement.SpaceBetween
                        ) {
                            IconButton(
                                onClick = { viewModel.shiftDate(-1) },
                                modifier = Modifier.background(Color(0xFF1E293B), RoundedCornerShape(8.dp))
                            ) {
                                Icon(Icons.Default.ChevronLeft, contentDescription = "Prev Day", tint = TextPrimary)
                            }

                            Column(horizontalAlignment = Alignment.CenterHorizontally) {
                                Text(
                                    text = uiState.selectedDate,
                                    fontSize = 18.sp,
                                    fontWeight = FontWeight.Bold,
                                    fontFamily = FontFamily.Monospace,
                                    color = TextPrimary
                                )
                                Text(
                                    text = "$dayName • ${if (isWorkingDay) "Working Day" else "Off / Sunday"}",
                                    fontSize = 11.sp,
                                    color = if (isWorkingDay) SafeEmerald else TextMuted
                                )
                            }

                            IconButton(
                                onClick = { viewModel.shiftDate(1) },
                                modifier = Modifier.background(Color(0xFF1E293B), RoundedCornerShape(8.dp))
                            ) {
                                Icon(Icons.Default.ChevronRight, contentDescription = "Next Day", tint = TextPrimary)
                            }
                        }
                    }
                }
            }

            // 2. Batch 1-Tap Action Card
            item {
                GlassCard(modifier = Modifier.fillMaxWidth(), backgroundColor = BgSurface) {
                    Row(
                        modifier = Modifier.padding(16.dp),
                        verticalAlignment = Alignment.CenterVertically,
                        horizontalArrangement = Arrangement.SpaceBetween
                    ) {
                        Column(modifier = Modifier.weight(1f)) {
                            Text("Attended all lectures today?", fontWeight = FontWeight.Bold, color = TextPrimary, fontSize = 13.sp)
                            Text("1-Tap marks 100% presence for ${uiState.selectedDate}", color = TextSecondary, fontSize = 11.sp)
                        }
                        Button(
                            onClick = { viewModel.markAllPresent() },
                            enabled = !uiState.isLoading && uiState.subjects.isNotEmpty(),
                            shape = RoundedCornerShape(10.dp),
                            colors = ButtonDefaults.buttonColors(containerColor = SafeEmerald)
                        ) {
                            Icon(Icons.Default.DoneAll, contentDescription = null, modifier = Modifier.size(16.dp))
                            Spacer(modifier = Modifier.width(6.dp))
                            Text("Mark All", fontWeight = FontWeight.Bold, fontSize = 12.sp)
                        }
                    }
                }
            }

            // 3. Section Title
            item {
                Text(
                    text = "Enrolled Course Logger (${uiState.subjects.size})",
                    style = Typography.titleMedium,
                    color = TextPrimary
                )
            }

            // 4. Course Logger Cards
            items(uiState.subjects, key = { it.id }) { sub ->
                val currentLog = uiState.logsForDate.find { it.subjectId == sub.id }
                val meetsToday = sub.workingDays.contains(dayOfWeek)
                val stats = AttendanceCalculator.calculateSubjectStats(sub.attended, sub.total, sub.targetPercentage)

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
                                Text(sub.code, fontWeight = FontWeight.Bold, color = TextPrimary, fontFamily = FontFamily.Monospace)
                                StatusBadge(
                                    text = if (meetsToday) "Class Today" else "No Class",
                                    color = if (meetsToday) SafeEmerald else AccentIndigo
                                )
                                if (sub.lectureTime.isNotBlank()) {
                                    StatusBadge(
                                        text = "⏰ ${sub.lectureTime}",
                                        color = AccentCyan
                                    )
                                }
                            }
                            Text(
                                text = "${stats.percentage}%",
                                fontWeight = FontWeight.Bold,
                                color = if (stats.percentage >= sub.targetPercentage) SafeEmerald else CriticalRose,
                                fontFamily = FontFamily.Monospace
                            )
                        }

                        Spacer(modifier = Modifier.height(4.dp))
                        Text(sub.name, fontWeight = FontWeight.SemiBold, color = TextPrimary, fontSize = 14.sp)
                        Text("${sub.attended}/${sub.total} classes conducted", color = TextSecondary, fontSize = 11.sp)

                        if (currentLog != null) {
                            Spacer(modifier = Modifier.height(8.dp))
                            Text(
                                text = "✓ Marked as ${currentLog.status.value.uppercase()} for ${uiState.selectedDate}",
                                color = when (currentLog.status) {
                                    AttendanceStatus.PRESENT -> SafeEmerald
                                    AttendanceStatus.ABSENT -> CriticalRose
                                    AttendanceStatus.CANCELLED -> AccentIndigo
                                },
                                fontSize = 11.sp,
                                fontWeight = FontWeight.Bold
                            )
                        }

                        Spacer(modifier = Modifier.height(12.dp))

                        // 3 State Buttons
                        Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                            val isPresent = currentLog?.status == AttendanceStatus.PRESENT
                            val isAbsent = currentLog?.status == AttendanceStatus.ABSENT
                            val isCancelled = currentLog?.status == AttendanceStatus.CANCELLED
                            val isSubmitting = uiState.submittingSubjectId == sub.id

                            Button(
                                onClick = { viewModel.logSubject(sub.id, sub.name, AttendanceStatus.PRESENT) },
                                enabled = !isSubmitting,
                                shape = RoundedCornerShape(8.dp),
                                colors = ButtonDefaults.buttonColors(
                                    containerColor = if (isPresent) SafeEmerald else Color(0xFF1E293B)
                                ),
                                modifier = Modifier
                                    .weight(1f)
                                    .height(38.dp)
                                    .then(if (isPresent) Modifier.border(1.dp, SafeEmerald, RoundedCornerShape(8.dp)) else Modifier)
                            ) {
                                Text("Present", color = if (isPresent) Color.White else TextSecondary, fontSize = 11.sp, fontWeight = FontWeight.Bold)
                            }

                            Button(
                                onClick = { viewModel.logSubject(sub.id, sub.name, AttendanceStatus.ABSENT) },
                                enabled = !isSubmitting,
                                shape = RoundedCornerShape(8.dp),
                                colors = ButtonDefaults.buttonColors(
                                    containerColor = if (isAbsent) CriticalRose else Color(0xFF1E293B)
                                ),
                                modifier = Modifier
                                    .weight(1f)
                                    .height(38.dp)
                                    .then(if (isAbsent) Modifier.border(1.dp, CriticalRose, RoundedCornerShape(8.dp)) else Modifier)
                            ) {
                                Text("Absent", color = if (isAbsent) Color.White else TextSecondary, fontSize = 11.sp, fontWeight = FontWeight.Bold)
                            }

                            Button(
                                onClick = { viewModel.logSubject(sub.id, sub.name, AttendanceStatus.CANCELLED) },
                                enabled = !isSubmitting,
                                shape = RoundedCornerShape(8.dp),
                                colors = ButtonDefaults.buttonColors(
                                    containerColor = if (isCancelled) AccentIndigo else Color(0xFF1E293B)
                                ),
                                modifier = Modifier
                                    .weight(1f)
                                    .height(38.dp)
                                    .then(if (isCancelled) Modifier.border(1.dp, AccentIndigo, RoundedCornerShape(8.dp)) else Modifier)
                            ) {
                                Text("Cancelled", color = if (isCancelled) Color.White else TextSecondary, fontSize = 11.sp, fontWeight = FontWeight.Bold)
                            }
                        }
                    }
                }
            }

            // 5. Date Audit Logs
            item {
                Text(
                    text = "Entries Logged for ${uiState.selectedDate} (${uiState.logsForDate.size})",
                    style = Typography.titleMedium,
                    color = TextPrimary
                )
            }

            if (uiState.logsForDate.isEmpty()) {
                item {
                    GlassCard(modifier = Modifier.fillMaxWidth(), backgroundColor = BgSurface) {
                        Box(modifier = Modifier.padding(24.dp), contentAlignment = Alignment.Center) {
                            Text("No entries recorded for this date yet.", color = TextMuted, fontSize = 12.sp)
                        }
                    }
                }
            } else {
                items(uiState.logsForDate, key = { it.id }) { log ->
                    GlassCard(modifier = Modifier.fillMaxWidth(), backgroundColor = BgSurface) {
                        Row(
                            modifier = Modifier.padding(14.dp),
                            verticalAlignment = Alignment.CenterVertically,
                            horizontalArrangement = Arrangement.SpaceBetween
                        ) {
                            Column {
                                Text(log.subjectName, fontWeight = FontWeight.Bold, color = TextPrimary)
                                Text(
                                    text = "Status: ${log.status.value.uppercase()} • ${log.note.ifBlank { "No notes" }}",
                                    color = TextSecondary,
                                    fontSize = 11.sp
                                )
                            }
                            TextButton(onClick = { viewModel.deleteLog(log.id) }) {
                                Text("Revert", color = CriticalRose, fontSize = 12.sp)
                            }
                        }
                    }
                }
            }
        }
    }
}
