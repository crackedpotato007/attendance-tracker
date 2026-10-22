package com.bunkpulse.android.ui.subjects

import android.widget.Toast
import androidx.compose.foundation.background
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
import com.bunkpulse.android.core.designsystem.components.ServerConfigDialog
import com.bunkpulse.android.core.designsystem.components.StatusBadge
import com.bunkpulse.android.core.designsystem.theme.*
import com.bunkpulse.android.domain.calculator.AttendanceCalculator

@Composable
fun SubjectsManagerScreen(
    viewModel: SubjectsViewModel,
    onLoggedOut: () -> Unit
) {
    val uiState by viewModel.uiState.collectAsState()
    val context = LocalContext.current

    LaunchedEffect(uiState.toastMessage) {
        uiState.toastMessage?.let {
            Toast.makeText(context, it, Toast.LENGTH_SHORT).show()
            viewModel.clearToast()
        }
    }

    if (uiState.showServerConfigDialog) {
        ServerConfigDialog(
            currentUrl = uiState.serverBaseUrl,
            onDismiss = { viewModel.closeServerConfigDialog() },
            onSaveUrl = { viewModel.updateServerUrl(it) }
        )
    }

    if (uiState.showAddEditSheet) {
        AddEditCourseSheet(
            subject = uiState.editingSubject,
            onDismiss = { viewModel.closeAddEditSheet() },
            onSave = { code, name, faculty, room, color, target, attended, total, workingDays, startDate, lectureTime ->
                viewModel.saveSubject(code, name, faculty, room, color, target, attended, total, workingDays, startDate, lectureTime)
            }
        )
    }

    if (uiState.showSettingsSheet) {
        ProfileSettingsSheet(
            user = uiState.user,
            serverUrl = uiState.serverBaseUrl,
            onDismiss = { viewModel.closeSettingsSheet() },
            onOpenServerConfig = {
                viewModel.closeSettingsSheet()
                viewModel.openServerConfigDialog()
            },
            onReconcileToday = { viewModel.reconcileScheduleToday() },
            onUpdateProfile = { name, target -> viewModel.updateProfile(name, target) },
            onLogout = { viewModel.logout(onLoggedOut) }
        )
    }

    Scaffold(
        containerColor = BgMain,
        floatingActionButton = {
            FloatingActionButton(
                onClick = { viewModel.openAddSheet() },
                containerColor = AccentIndigo,
                contentColor = Color.White,
                shape = CircleShape,
                modifier = Modifier.padding(bottom = 70.dp)
            ) {
                Icon(Icons.Default.Add, contentDescription = "Add Course")
            }
        }
    ) { padding ->
        LazyColumn(
            modifier = Modifier
                .fillMaxSize()
                .padding(padding),
            contentPadding = PaddingValues(start = 16.dp, top = 16.dp, end = 16.dp, bottom = 96.dp),
            verticalArrangement = Arrangement.spacedBy(14.dp)
        ) {
            // Header Bar
            item {
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.SpaceBetween,
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Column {
                        Text("Course Manager", style = Typography.headlineMedium, color = TextPrimary)
                        Text(
                            "${uiState.subjects.size} Courses Enrolled",
                            color = TextSecondary,
                            fontSize = 12.sp
                        )
                    }

                    Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                        IconButton(onClick = { viewModel.refreshSubjects() }) {
                            Icon(Icons.Default.Refresh, contentDescription = "Refresh", tint = TextPrimary)
                        }
                        IconButton(onClick = { viewModel.openSettingsSheet() }) {
                            Icon(Icons.Default.Settings, contentDescription = "Settings", tint = TextPrimary)
                        }
                    }
                }
            }

            // Quick Stats Banner
            item {
                val overall = AttendanceCalculator.calculateOverallStats(
                    uiState.subjects,
                    uiState.user?.targetAttendance ?: 75
                )

                GlassCard(modifier = Modifier.fillMaxWidth(), backgroundColor = BgSurface) {
                    Row(
                        modifier = Modifier
                            .fillMaxWidth()
                            .padding(16.dp),
                        horizontalArrangement = Arrangement.SpaceBetween,
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        Column {
                            Text("OVERALL TELEMETRY", fontSize = 10.sp, color = TextMuted, fontWeight = FontWeight.Bold, letterSpacing = 1.sp)
                            Text("${overall.overallPercentage}%", style = Typography.headlineMedium, color = if (overall.isAboveTarget) SafeEmerald else CriticalRose)
                        }

                        Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                            StatusBadge(text = "${overall.dangerCount} Critical", color = if (overall.dangerCount > 0) CriticalRose else SafeEmerald)
                            StatusBadge(text = "${overall.totalSafeBunks} Bunks Left", color = AccentIndigo)
                        }
                    }
                }
            }

            // Subject Cards
            if (uiState.subjects.isEmpty()) {
                item {
                    GlassCard(modifier = Modifier.fillMaxWidth(), backgroundColor = BgSurface) {
                        Column(
                            modifier = Modifier
                                .fillMaxWidth()
                                .padding(32.dp),
                            horizontalAlignment = Alignment.CenterHorizontally
                        ) {
                            Icon(Icons.Default.MenuBook, contentDescription = null, tint = TextMuted, modifier = Modifier.size(48.dp))
                            Spacer(modifier = Modifier.height(12.dp))
                            Text("No courses added yet.", color = TextPrimary, fontWeight = FontWeight.Bold)
                            Text("Tap the + button below to enroll your first semester course.", color = TextSecondary, fontSize = 12.sp)
                        }
                    }
                }
            } else {
                items(uiState.subjects, key = { it.id }) { sub ->
                    val stats = AttendanceCalculator.calculateSubjectStats(sub.attended, sub.total, sub.targetPercentage)
                    val isSafe = stats.percentage >= sub.targetPercentage

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
                                            .background(Color(android.graphics.Color.parseColor(sub.color.ifBlank { "#6366f1" })))
                                    )
                                    Text(sub.code, fontWeight = FontWeight.Bold, color = TextPrimary, fontFamily = FontFamily.Monospace)
                                    if (sub.lectureTime.isNotBlank()) {
                                        Box(
                                            modifier = Modifier
                                                .clip(RoundedCornerShape(6.dp))
                                                .background(AccentCyan.copy(alpha = 0.15f))
                                                .padding(horizontal = 6.dp, vertical = 2.dp)
                                        ) {
                                            Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(3.dp)) {
                                                Icon(Icons.Default.AccessTime, contentDescription = null, tint = AccentCyan, modifier = Modifier.size(11.dp))
                                                Text(sub.lectureTime, color = AccentCyan, fontSize = 10.sp, fontWeight = FontWeight.Bold)
                                            }
                                        }
                                    }
                                }

                                Row {
                                    IconButton(onClick = { viewModel.openEditSheet(sub) }) {
                                        Icon(Icons.Default.Edit, contentDescription = "Edit", tint = TextSecondary, modifier = Modifier.size(16.dp))
                                    }
                                    IconButton(onClick = { viewModel.deleteSubject(sub.id) }) {
                                        Icon(Icons.Default.Delete, contentDescription = "Delete", tint = CriticalRose, modifier = Modifier.size(16.dp))
                                    }
                                }
                            }

                            Text(sub.name, style = Typography.titleMedium, color = TextPrimary)
                            Text("${sub.faculty.ifBlank { "Faculty" }} • ${sub.room.ifBlank { "Hall" }}", color = TextSecondary, fontSize = 11.sp)

                            Spacer(modifier = Modifier.height(10.dp))
                            AttendanceProgressBar(percentage = stats.percentage, targetPercentage = sub.targetPercentage)

                            Spacer(modifier = Modifier.height(6.dp))
                            Row(
                                modifier = Modifier.fillMaxWidth(),
                                horizontalArrangement = Arrangement.SpaceBetween
                            ) {
                                Text("${sub.attended} / ${sub.total} conducted", color = TextSecondary, fontSize = 11.sp)
                                Text(
                                    "${stats.percentage}% (Target: ${sub.targetPercentage}%)",
                                    color = if (isSafe) SafeEmerald else CriticalRose,
                                    fontWeight = FontWeight.Bold,
                                    fontSize = 11.sp
                                )
                            }
                        }
                    }
                }
            }
        }
    }
}
