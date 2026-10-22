package com.bunkpulse.android.ui.schedule

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.CalendarMonth
import androidx.compose.material.icons.filled.Close
import androidx.compose.material.icons.filled.Delete
import androidx.compose.material3.*
import androidx.compose.runtime.Composable
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
import com.bunkpulse.android.domain.model.AttendanceRecord
import com.bunkpulse.android.domain.model.AttendanceStatus
import com.bunkpulse.android.domain.model.CustomHoliday
import com.bunkpulse.android.domain.model.Subject

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun DayAttendanceEditorSheet(
    dateStr: String,
    subjects: List<Subject>,
    logsForDate: List<AttendanceRecord>,
    holiday: CustomHoliday?,
    isWorkingDay: Boolean,
    onDismiss: () -> Unit,
    onLogSubject: (String, String, AttendanceStatus) -> Unit,
    onDeleteLog: (String) -> Unit
) {
    val sheetState = rememberModalBottomSheetState(skipPartiallyExpanded = true)

    ModalBottomSheet(
        onDismissRequest = onDismiss,
        sheetState = sheetState,
        containerColor = BgSurface,
        shape = RoundedCornerShape(topStart = 20.dp, topEnd = 20.dp)
    ) {
        Column(
            modifier = Modifier
                .fillMaxWidth()
                .padding(horizontal = 20.dp, vertical = 10.dp)
                .navigationBarsPadding()
        ) {
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically
            ) {
                Row(
                    verticalAlignment = Alignment.CenterVertically,
                    horizontalArrangement = Arrangement.spacedBy(8.dp)
                ) {
                    Icon(Icons.Default.CalendarMonth, contentDescription = null, tint = AccentIndigo)
                    Column {
                        Text("Attendance Editor", style = Typography.titleLarge, color = TextPrimary)
                        Text(dateStr, color = TextSecondary, fontSize = 12.sp, fontFamily = FontFamily.Monospace)
                    }
                }
                IconButton(onClick = onDismiss) {
                    Icon(Icons.Default.Close, contentDescription = "Close", tint = TextMuted)
                }
            }

            Spacer(modifier = Modifier.height(10.dp))

            if (holiday != null) {
                Box(
                    modifier = Modifier
                        .fillMaxWidth()
                        .background(HolidayPurple.copy(alpha = 0.15f), RoundedCornerShape(8.dp))
                        .padding(10.dp)
                ) {
                    Text("College Holiday / Fest: ${holiday.name}", color = HolidayPurple, fontSize = 12.sp, fontWeight = FontWeight.Bold)
                }
                Spacer(modifier = Modifier.height(10.dp))
            }

            LazyColumn(
                verticalArrangement = Arrangement.spacedBy(10.dp),
                modifier = Modifier.fillMaxWidth().heightIn(max = 420.dp)
            ) {
                items(subjects, key = { it.id }) { sub ->
                    val log = logsForDate.find { it.subjectId == sub.id }
                    val currentStatus = log?.status

                    GlassCard(modifier = Modifier.fillMaxWidth(), backgroundColor = BgInput) {
                        Column(modifier = Modifier.padding(12.dp)) {
                            Row(
                                modifier = Modifier.fillMaxWidth(),
                                horizontalArrangement = Arrangement.SpaceBetween,
                                verticalAlignment = Alignment.CenterVertically
                            ) {
                                Text("${sub.name} (${sub.code})", fontWeight = FontWeight.Bold, color = TextPrimary, fontSize = 13.sp)
                                if (currentStatus != null) {
                                    StatusBadge(
                                        text = currentStatus.value.uppercase(),
                                        color = when (currentStatus) {
                                            AttendanceStatus.PRESENT -> SafeEmerald
                                            AttendanceStatus.ABSENT -> CriticalRose
                                            AttendanceStatus.CANCELLED -> AccentIndigo
                                        }
                                    )
                                }
                            }

                            Spacer(modifier = Modifier.height(8.dp))

                            Row(horizontalArrangement = Arrangement.spacedBy(6.dp)) {
                                Button(
                                    onClick = { onLogSubject(sub.id, sub.name, AttendanceStatus.PRESENT) },
                                    shape = RoundedCornerShape(6.dp),
                                    colors = ButtonDefaults.buttonColors(
                                        containerColor = if (currentStatus == AttendanceStatus.PRESENT) SafeEmerald else Color(0xFF1E293B)
                                    ),
                                    modifier = Modifier.weight(1f).height(34.dp)
                                ) {
                                    Text("Present", fontSize = 11.sp, fontWeight = FontWeight.Bold)
                                }

                                Button(
                                    onClick = { onLogSubject(sub.id, sub.name, AttendanceStatus.ABSENT) },
                                    shape = RoundedCornerShape(6.dp),
                                    colors = ButtonDefaults.buttonColors(
                                        containerColor = if (currentStatus == AttendanceStatus.ABSENT) CriticalRose else Color(0xFF1E293B)
                                    ),
                                    modifier = Modifier.weight(1f).height(34.dp)
                                ) {
                                    Text("Absent", fontSize = 11.sp, fontWeight = FontWeight.Bold)
                                }

                                Button(
                                    onClick = { onLogSubject(sub.id, sub.name, AttendanceStatus.CANCELLED) },
                                    shape = RoundedCornerShape(6.dp),
                                    colors = ButtonDefaults.buttonColors(
                                        containerColor = if (currentStatus == AttendanceStatus.CANCELLED) AccentIndigo else Color(0xFF1E293B)
                                    ),
                                    modifier = Modifier.weight(1f).height(34.dp)
                                ) {
                                    Text("Cancelled", fontSize = 11.sp, fontWeight = FontWeight.Bold)
                                }

                                if (log != null) {
                                    IconButton(
                                        onClick = { onDeleteLog(log.id) },
                                        modifier = Modifier.size(34.dp)
                                    ) {
                                        Icon(Icons.Default.Delete, contentDescription = "Revert", tint = CriticalRose, modifier = Modifier.size(16.dp))
                                    }
                                }
                            }
                        }
                    }
                }
            }
            Spacer(modifier = Modifier.height(32.dp))
        }
    }
}
