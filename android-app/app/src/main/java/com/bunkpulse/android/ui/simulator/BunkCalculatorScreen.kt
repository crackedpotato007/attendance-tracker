package com.bunkpulse.android.ui.simulator

import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
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
import androidx.compose.ui.text.font.FontFamily
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.bunkpulse.android.core.designsystem.components.GlassCard
import com.bunkpulse.android.core.designsystem.components.StatusBadge
import com.bunkpulse.android.core.designsystem.theme.*
import com.bunkpulse.android.domain.calculator.AttendanceCalculator
import com.bunkpulse.android.domain.model.Subject

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun BunkCalculatorScreen(
    viewModel: SimulatorViewModel
) {
    val uiState by viewModel.uiState.collectAsState()
    val selectedSub = uiState.subjects.find { it.id == uiState.selectedSubjectId } ?: uiState.subjects.firstOrNull()

    var courseDropdownExpanded by remember { mutableStateOf(false) }

    Box(modifier = Modifier.fillMaxSize().background(BgMain)) {
        LazyColumn(
            modifier = Modifier.fillMaxSize(),
            contentPadding = PaddingValues(16.dp),
            verticalArrangement = Arrangement.spacedBy(16.dp)
        ) {
            // 1. Hero & Target Slider Card
            item {
                GlassCard(modifier = Modifier.fillMaxWidth(), backgroundColor = BgSurface) {
                    Column(modifier = Modifier.padding(18.dp)) {
                        Row(
                            verticalAlignment = Alignment.CenterVertically,
                            horizontalArrangement = Arrangement.spacedBy(6.dp)
                        ) {
                            Icon(Icons.Default.Calculate, contentDescription = null, tint = AccentIndigo, modifier = Modifier.size(16.dp))
                            Text("Predictive Bunk & Recovery Intelligence", color = TextSecondary, fontSize = 12.sp, fontWeight = FontWeight.SemiBold)
                        }

                        Spacer(modifier = Modifier.height(10.dp))
                        Text("Interactive Bunk Simulator", style = Typography.headlineMedium, fontWeight = FontWeight.Bold, color = TextPrimary)
                        Text("Simulate skipping lectures with zero academic risk", style = Typography.bodyMedium, color = TextSecondary)

                        Spacer(modifier = Modifier.height(16.dp))

                        // Target Threshold Slider
                        Row(
                            modifier = Modifier.fillMaxWidth(),
                            horizontalArrangement = Arrangement.SpaceBetween,
                            verticalAlignment = Alignment.CenterVertically
                        ) {
                            Text("Attendance Threshold Goal:", fontSize = 12.sp, color = TextSecondary, fontWeight = FontWeight.Medium)
                            Text("${uiState.targetGoal}%", fontSize = 16.sp, fontWeight = FontWeight.Bold, color = SafeEmerald, fontFamily = FontFamily.Monospace)
                        }

                        Slider(
                            value = uiState.targetGoal.toFloat(),
                            onValueChange = { viewModel.setTargetGoal(it.toInt()) },
                            valueRange = 60f..95f,
                            steps = 34,
                            colors = SliderDefaults.colors(thumbColor = AccentIndigo, activeTrackColor = AccentIndigo)
                        )

                        Row(
                            modifier = Modifier.fillMaxWidth(),
                            horizontalArrangement = Arrangement.SpaceBetween
                        ) {
                            Text("60%", fontSize = 10.sp, color = TextMuted)
                            Text("75% (Standard)", fontSize = 10.sp, color = AccentIndigo, fontWeight = FontWeight.Bold)
                            Text("85%", fontSize = 10.sp, color = TextMuted)
                            Text("95%", fontSize = 10.sp, color = TextMuted)
                        }
                    }
                }
            }

            if (selectedSub != null) {
                val currentStats = AttendanceCalculator.calculateSubjectStats(selectedSub.attended, selectedSub.total, uiState.targetGoal)
                val projectedPct = AttendanceCalculator.simulateSingleSubject(selectedSub, uiState.simBunkClasses, uiState.simAttendClasses)
                val isProjectedSafe = projectedPct >= uiState.targetGoal
                val delta = (projectedPct - currentStats.percentage).let {
                    AttendanceCalculator.round1Dec(it.toDouble())
                }

                // 2. Single-Course What-If Simulator Card
                item {
                    GlassCard(modifier = Modifier.fillMaxWidth(), backgroundColor = BgSurface) {
                        Column(modifier = Modifier.padding(18.dp)) {
                            Row(
                                modifier = Modifier.fillMaxWidth(),
                                horizontalArrangement = Arrangement.SpaceBetween,
                                verticalAlignment = Alignment.CenterVertically
                            ) {
                                Text("\"What-If\" Class Bunk Simulator", style = Typography.titleMedium, color = TextPrimary)
                                StatusBadge(text = "Single Course", color = AccentCyan)
                            }

                            Spacer(modifier = Modifier.height(14.dp))

                            // Course Selector Dropdown
                            ExposedDropdownMenuBox(
                                expanded = courseDropdownExpanded,
                                onExpandedChange = { courseDropdownExpanded = it }
                            ) {
                                OutlinedTextField(
                                    value = "${selectedSub.name} (${selectedSub.code})",
                                    onValueChange = {},
                                    readOnly = true,
                                    label = { Text("Selected Course") },
                                    trailingIcon = { ExposedDropdownMenuDefaults.TrailingIcon(expanded = courseDropdownExpanded) },
                                    colors = OutlinedTextFieldDefaults.colors(
                                        focusedTextColor = TextPrimary,
                                        unfocusedTextColor = TextPrimary,
                                        focusedContainerColor = BgInput,
                                        unfocusedContainerColor = BgInput,
                                        focusedBorderColor = AccentIndigo,
                                        unfocusedBorderColor = BorderMedium
                                    ),
                                    modifier = Modifier.menuAnchor().fillMaxWidth(),
                                    shape = RoundedCornerShape(10.dp)
                                )

                                ExposedDropdownMenu(
                                    expanded = courseDropdownExpanded,
                                    onDismissRequest = { courseDropdownExpanded = false },
                                    modifier = Modifier.background(BgSurface)
                                ) {
                                    uiState.subjects.forEach { s ->
                                        DropdownMenuItem(
                                            text = { Text("${s.name} (${s.code})", color = TextPrimary) },
                                            onClick = {
                                                viewModel.selectSubject(s.id)
                                                courseDropdownExpanded = false
                                            }
                                        )
                                    }
                                }
                            }

                            Spacer(modifier = Modifier.height(16.dp))

                            // Dual Steppers for Bunk & Attend
                            Row(horizontalArrangement = Arrangement.spacedBy(12.dp)) {
                                StepperControl(
                                    label = "Classes to Bunk (Skip):",
                                    count = uiState.simBunkClasses,
                                    color = CriticalRose,
                                    onMinus = { viewModel.changeBunk(-1) },
                                    onPlus = { viewModel.changeBunk(1) },
                                    modifier = Modifier.weight(1f)
                                )

                                StepperControl(
                                    label = "Classes to Attend:",
                                    count = uiState.simAttendClasses,
                                    color = SafeEmerald,
                                    onMinus = { viewModel.changeAttend(-1) },
                                    onPlus = { viewModel.changeAttend(1) },
                                    modifier = Modifier.weight(1f)
                                )
                            }

                            Spacer(modifier = Modifier.height(16.dp))

                            // Telemetry Comparison
                            Row(
                                modifier = Modifier
                                    .fillMaxWidth()
                                    .background(BgInput, RoundedCornerShape(12.dp))
                                    .padding(14.dp),
                                horizontalArrangement = Arrangement.SpaceBetween,
                                verticalAlignment = Alignment.CenterVertically
                            ) {
                                Column {
                                    Text("Current", fontSize = 11.sp, color = TextMuted)
                                    Text("${currentStats.percentage}%", fontSize = 18.sp, fontWeight = FontWeight.Bold, color = TextPrimary, fontFamily = FontFamily.Monospace)
                                    Text("${selectedSub.attended}/${selectedSub.total} classes", fontSize = 10.sp, color = TextSecondary)
                                }

                                Icon(Icons.Default.ArrowForward, contentDescription = null, tint = AccentIndigo)

                                Column(horizontalAlignment = Alignment.End) {
                                    Text("Projected", fontSize = 11.sp, color = TextMuted)
                                    Text("$projectedPct%", fontSize = 22.sp, fontWeight = FontWeight.ExtraBold, color = if (isProjectedSafe) SafeEmerald else CriticalRose, fontFamily = FontFamily.Monospace)
                                    Text(if (delta >= 0) "+$delta%" else "$delta%", fontSize = 11.sp, fontWeight = FontWeight.Bold, color = if (delta >= 0) SafeEmerald else CriticalRose)
                                }
                            }

                            Spacer(modifier = Modifier.height(12.dp))

                            // Verdict Box
                            Box(
                                modifier = Modifier
                                    .fillMaxWidth()
                                    .background(
                                        if (isProjectedSafe) SafeEmerald.copy(alpha = 0.12f) else CriticalRose.copy(alpha = 0.12f),
                                        RoundedCornerShape(10.dp)
                                    )
                                    .border(1.dp, if (isProjectedSafe) SafeEmerald.copy(alpha = 0.35f) else CriticalRose.copy(alpha = 0.35f), RoundedCornerShape(10.dp))
                                    .padding(14.dp)
                            ) {
                                Row(
                                    verticalAlignment = Alignment.CenterVertically,
                                    horizontalArrangement = Arrangement.spacedBy(10.dp)
                                ) {
                                    Icon(
                                        if (isProjectedSafe) Icons.Default.CheckCircle else Icons.Default.Warning,
                                        contentDescription = null,
                                        tint = if (isProjectedSafe) SafeEmerald else CriticalRose,
                                        modifier = Modifier.size(24.dp)
                                    )
                                    Column {
                                        Text(
                                            if (isProjectedSafe) "SAFE TO BUNK! 🎉" else "ATTENDANCE AT RISK! ⚠️",
                                            fontWeight = FontWeight.Bold,
                                            fontSize = 13.sp,
                                            color = if (isProjectedSafe) SafeEmerald else CriticalRose
                                        )
                                        Text(
                                            if (isProjectedSafe) {
                                                "Even after skipping ${uiState.simBunkClasses} classes, attendance stays at $projectedPct% (above ${uiState.targetGoal}% target)."
                                            } else {
                                                "Skipping drops you to $projectedPct% (below ${uiState.targetGoal}% goal). Consecutive attendance is needed to recover!"
                                            },
                                            fontSize = 11.sp,
                                            color = TextSecondary
                                        )
                                    }
                                }
                            }
                        }
                    }
                }
            }

            // 3. Multi-Day Vacation / Leave Impact Table
            item {
                GlassCard(modifier = Modifier.fillMaxWidth(), backgroundColor = BgSurface) {
                    Column(modifier = Modifier.padding(18.dp)) {
                        Row(
                            modifier = Modifier.fillMaxWidth(),
                            horizontalArrangement = Arrangement.SpaceBetween,
                            verticalAlignment = Alignment.CenterVertically
                        ) {
                            Text("Multi-Day Vacation / Leave Impact", style = Typography.titleMedium, color = TextPrimary)
                            StatusBadge(text = "All Courses", color = WarningAmber)
                        }

                        Spacer(modifier = Modifier.height(14.dp))

                        Row(horizontalArrangement = Arrangement.spacedBy(12.dp)) {
                            StepperControl(
                                label = "Working Days Off:",
                                count = uiState.vacationDaysOff,
                                color = WarningAmber,
                                onMinus = { viewModel.setVacationDays(uiState.vacationDaysOff - 1) },
                                onPlus = { viewModel.setVacationDays(uiState.vacationDaysOff + 1) },
                                modifier = Modifier.weight(1f)
                            )

                            StepperControl(
                                label = "Classes / Day:",
                                count = uiState.classesPerDay,
                                color = AccentCyan,
                                onMinus = { viewModel.setClassesPerDay(uiState.classesPerDay - 1) },
                                onPlus = { viewModel.setClassesPerDay(uiState.classesPerDay + 1) },
                                modifier = Modifier.weight(1f)
                            )
                        }

                        Spacer(modifier = Modifier.height(16.dp))

                        // Table Rows
                        uiState.subjects.forEach { s ->
                            val currentStats = AttendanceCalculator.calculateSubjectStats(s.attended, s.total, uiState.targetGoal)
                            val afterVacationPct = AttendanceCalculator.simulateLeaveCourse(s, uiState.vacationDaysOff, uiState.classesPerDay)
                            val safe = afterVacationPct >= uiState.targetGoal

                            Row(
                                modifier = Modifier
                                    .fillMaxWidth()
                                    .padding(vertical = 6.dp),
                                horizontalArrangement = Arrangement.SpaceBetween,
                                verticalAlignment = Alignment.CenterVertically
                            ) {
                                Row(
                                    verticalAlignment = Alignment.CenterVertically,
                                    horizontalArrangement = Arrangement.spacedBy(8.dp)
                                ) {
                                    Text(s.code, fontWeight = FontWeight.Bold, color = TextPrimary, fontFamily = FontFamily.Monospace)
                                    Text("${currentStats.percentage}%", color = TextSecondary, fontSize = 12.sp, fontFamily = FontFamily.Monospace)
                                }

                                Row(
                                    verticalAlignment = Alignment.CenterVertically,
                                    horizontalArrangement = Arrangement.spacedBy(10.dp)
                                ) {
                                    Text(
                                        text = "$afterVacationPct%",
                                        fontWeight = FontWeight.Bold,
                                        color = if (safe) SafeEmerald else CriticalRose,
                                        fontFamily = FontFamily.Monospace
                                    )
                                    StatusBadge(
                                        text = if (safe) "Safe" else "Drops Below",
                                        color = if (safe) SafeEmerald else CriticalRose
                                    )
                                }
                            }
                        }
                    }
                }
            }
        }
    }
}

@Composable
private fun StepperControl(
    label: String,
    count: Int,
    color: Color,
    onMinus: () -> Unit,
    onPlus: () -> Unit,
    modifier: Modifier = Modifier
) {
    Column(modifier = modifier) {
        Text(label, fontSize = 11.sp, color = color, fontWeight = FontWeight.SemiBold)
        Spacer(modifier = Modifier.height(6.dp))
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .background(BgInput, RoundedCornerShape(8.dp))
                .border(1.dp, BorderSubtle, RoundedCornerShape(8.dp))
                .padding(4.dp),
            verticalAlignment = Alignment.CenterVertically,
            horizontalArrangement = Arrangement.SpaceBetween
        ) {
            IconButton(onClick = onMinus, modifier = Modifier.size(32.dp)) {
                Text("-", fontSize = 18.sp, fontWeight = FontWeight.Bold, color = TextPrimary)
            }
            Text("$count", fontSize = 16.sp, fontWeight = FontWeight.Bold, color = TextPrimary, fontFamily = FontFamily.Monospace)
            IconButton(onClick = onPlus, modifier = Modifier.size(32.dp)) {
                Text("+", fontSize = 18.sp, fontWeight = FontWeight.Bold, color = TextPrimary)
            }
        }
    }
}
