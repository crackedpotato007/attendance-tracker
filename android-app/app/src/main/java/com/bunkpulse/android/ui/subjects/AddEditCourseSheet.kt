package com.bunkpulse.android.ui.subjects

import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.text.KeyboardActions
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.AccessTime
import androidx.compose.material.icons.filled.Book
import androidx.compose.material.icons.filled.Close
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.focus.FocusDirection
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.platform.LocalFocusManager
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.input.ImeAction
import androidx.compose.ui.text.input.KeyboardCapitalization
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.bunkpulse.android.core.designsystem.theme.*
import com.bunkpulse.android.domain.model.Subject
import java.time.LocalDate

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun AddEditCourseSheet(
    subject: Subject?,
    onDismiss: () -> Unit,
    onSave: (
        code: String,
        name: String,
        faculty: String,
        room: String,
        color: String,
        target: Int,
        attended: Int,
        total: Int,
        workingDays: List<Int>,
        startDate: String,
        lectureTime: String
    ) -> Unit
) {
    var name by remember { mutableStateOf(subject?.name ?: "") }
    var code by remember { mutableStateOf(subject?.code ?: "") }
    var faculty by remember { mutableStateOf(subject?.faculty ?: "") }
    var room by remember { mutableStateOf(subject?.room ?: "") }
    var color by remember { mutableStateOf(subject?.color ?: "#6366f1") }
    var targetPercentage by remember { mutableStateOf(subject?.targetPercentage ?: 75) }
    var attended by remember { mutableStateOf(subject?.attended ?: 0) }
    var total by remember { mutableStateOf(subject?.total ?: 0) }
    var workingDays by remember { mutableStateOf(subject?.workingDays ?: listOf(1, 2, 3, 4, 5, 6)) }
    var startDate by remember { mutableStateOf(subject?.startDate ?: LocalDate.now().toString()) }
    var lectureTime by remember { mutableStateOf(subject?.lectureTime ?: "") }

    val colorPalette = listOf("#6366f1", "#06b6d4", "#10b981", "#f59e0b", "#a855f7", "#ec4899", "#f43f5e", "#3b82f6")
    val sheetState = rememberModalBottomSheetState(skipPartiallyExpanded = true)
    val focusManager = LocalFocusManager.current

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
                .imePadding()
                .navigationBarsPadding()
                .verticalScroll(rememberScrollState())
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
                    Icon(Icons.Default.Book, contentDescription = null, tint = AccentIndigo)
                    Text(
                        text = if (subject != null) "Edit Course • ${subject.code}" else "Enroll New Course",
                        style = Typography.titleLarge,
                        color = TextPrimary
                    )
                }
                IconButton(onClick = onDismiss) {
                    Icon(Icons.Default.Close, contentDescription = "Close", tint = TextMuted)
                }
            }

            Spacer(modifier = Modifier.height(14.dp))

            // Course Name & Code
            Row(horizontalArrangement = Arrangement.spacedBy(10.dp)) {
                OutlinedTextField(
                    value = name,
                    onValueChange = { name = it },
                    label = { Text("Course Name") },
                    modifier = Modifier.weight(1.5f),
                    singleLine = true,
                    keyboardOptions = KeyboardOptions(
                        keyboardType = KeyboardType.Text,
                        imeAction = ImeAction.Next,
                        capitalization = KeyboardCapitalization.Words
                    ),
                    keyboardActions = KeyboardActions(
                        onNext = { focusManager.moveFocus(FocusDirection.Right) }
                    ),
                    shape = RoundedCornerShape(10.dp),
                    colors = OutlinedTextFieldDefaults.colors(focusedTextColor = TextPrimary, unfocusedTextColor = TextPrimary, focusedContainerColor = BgInput, unfocusedContainerColor = BgInput)
                )
                OutlinedTextField(
                    value = code,
                    onValueChange = { code = it },
                    label = { Text("Code") },
                    modifier = Modifier.weight(1f),
                    singleLine = true,
                    keyboardOptions = KeyboardOptions(
                        keyboardType = KeyboardType.Text,
                        imeAction = ImeAction.Next,
                        capitalization = KeyboardCapitalization.Characters
                    ),
                    keyboardActions = KeyboardActions(
                        onNext = { focusManager.moveFocus(FocusDirection.Down) }
                    ),
                    shape = RoundedCornerShape(10.dp),
                    colors = OutlinedTextFieldDefaults.colors(focusedTextColor = TextPrimary, unfocusedTextColor = TextPrimary, focusedContainerColor = BgInput, unfocusedContainerColor = BgInput)
                )
            }

            Spacer(modifier = Modifier.height(14.dp))

            // Scheduled Lecture Days Selector
            Text("Scheduled Lecture Working Days:", fontSize = 12.sp, color = TextSecondary)
            Spacer(modifier = Modifier.height(6.dp))

            val weekDayOptions = listOf(
                Pair(1, "Mon"), Pair(2, "Tue"), Pair(3, "Wed"),
                Pair(4, "Thu"), Pair(5, "Fri"), Pair(6, "Sat"), Pair(0, "Sun")
            )

            Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween) {
                weekDayOptions.forEach { (idx, shortName) ->
                    val active = workingDays.contains(idx)
                    Box(
                        modifier = Modifier
                            .size(38.dp)
                            .clip(RoundedCornerShape(8.dp))
                            .background(if (active) AccentIndigo else BgInput)
                            .border(1.dp, if (active) AccentIndigo else BorderSubtle, RoundedCornerShape(8.dp))
                            .clickable {
                                workingDays = if (active) {
                                    if (workingDays.size > 1) workingDays.filter { it != idx } else workingDays
                                } else {
                                    (workingDays + idx).sorted()
                                }
                            },
                        contentAlignment = Alignment.Center
                    ) {
                        Text(shortName, color = if (active) Color.White else TextSecondary, fontSize = 11.sp)
                    }
                }
            }

            Spacer(modifier = Modifier.height(16.dp))

            // Lecture Time (For Geofence Location Auto-Attendance)
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically
            ) {
                Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(6.dp)) {
                    Icon(Icons.Default.AccessTime, contentDescription = null, tint = AccentCyan, modifier = Modifier.size(16.dp))
                    Text("Lecture Time (Auto-Location Check)", fontSize = 12.sp, fontWeight = FontWeight.Bold, color = TextPrimary)
                }
                if (lectureTime.isNotBlank()) {
                    Box(
                        modifier = Modifier
                            .clip(RoundedCornerShape(6.dp))
                            .background(AccentCyan.copy(alpha = 0.15f))
                            .padding(horizontal = 8.dp, vertical = 2.dp)
                    ) {
                        Text("Active at $lectureTime", color = AccentCyan, fontSize = 10.sp, fontWeight = FontWeight.Bold)
                    }
                }
            }
            Spacer(modifier = Modifier.height(4.dp))
            Text(
                "At this time on lecture days, BunkPulse checks if you are within your campus geofence and marks present/absent.",
                fontSize = 11.sp,
                color = TextMuted
            )
            Spacer(modifier = Modifier.height(8.dp))

            OutlinedTextField(
                value = lectureTime,
                onValueChange = { lectureTime = it },
                label = { Text("Lecture Time (24h format, e.g. 09:30 or 14:15)") },
                placeholder = { Text("09:30") },
                modifier = Modifier.fillMaxWidth(),
                singleLine = true,
                keyboardOptions = KeyboardOptions(
                    keyboardType = KeyboardType.Text,
                    imeAction = ImeAction.Next
                ),
                keyboardActions = KeyboardActions(
                    onNext = { focusManager.moveFocus(FocusDirection.Down) }
                ),
                shape = RoundedCornerShape(10.dp),
                colors = OutlinedTextFieldDefaults.colors(
                    focusedTextColor = TextPrimary,
                    unfocusedTextColor = TextPrimary,
                    focusedBorderColor = AccentCyan,
                    focusedContainerColor = BgInput,
                    unfocusedContainerColor = BgInput
                )
            )

            Spacer(modifier = Modifier.height(6.dp))
            // Quick time preset chips
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.spacedBy(6.dp)
            ) {
                listOf("09:00", "10:00", "11:30", "14:00", "15:30").forEach { preset ->
                    Box(
                        modifier = Modifier
                            .clip(RoundedCornerShape(6.dp))
                            .background(if (lectureTime == preset) AccentCyan else BgInput)
                            .border(1.dp, if (lectureTime == preset) AccentCyan else BorderSubtle, RoundedCornerShape(6.dp))
                            .clickable { lectureTime = preset }
                            .padding(horizontal = 8.dp, vertical = 4.dp)
                    ) {
                        Text(
                            preset,
                            color = if (lectureTime == preset) Color.Black else TextSecondary,
                            fontSize = 10.sp,
                            fontWeight = FontWeight.Medium
                        )
                    }
                }
                if (lectureTime.isNotBlank()) {
                    Box(
                        modifier = Modifier
                            .clip(RoundedCornerShape(6.dp))
                            .background(CriticalRose.copy(alpha = 0.15f))
                            .clickable { lectureTime = "" }
                            .padding(horizontal = 8.dp, vertical = 4.dp)
                    ) {
                        Text("Clear", color = CriticalRose, fontSize = 10.sp, fontWeight = FontWeight.Medium)
                    }
                }
            }

            Spacer(modifier = Modifier.height(14.dp))

            // Initial Counters & Target
            Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                OutlinedTextField(
                    value = "$attended",
                    onValueChange = { attended = it.toIntOrNull() ?: 0 },
                    label = { Text("Attended") },
                    modifier = Modifier.weight(1f),
                    singleLine = true,
                    keyboardOptions = KeyboardOptions(
                        keyboardType = KeyboardType.Number,
                        imeAction = ImeAction.Next
                    ),
                    keyboardActions = KeyboardActions(
                        onNext = { focusManager.moveFocus(FocusDirection.Right) }
                    ),
                    shape = RoundedCornerShape(10.dp),
                    colors = OutlinedTextFieldDefaults.colors(focusedTextColor = TextPrimary, unfocusedTextColor = TextPrimary, focusedContainerColor = BgInput, unfocusedContainerColor = BgInput)
                )
                OutlinedTextField(
                    value = "$total",
                    onValueChange = { total = it.toIntOrNull() ?: 0 },
                    label = { Text("Total") },
                    modifier = Modifier.weight(1f),
                    singleLine = true,
                    keyboardOptions = KeyboardOptions(
                        keyboardType = KeyboardType.Number,
                        imeAction = ImeAction.Next
                    ),
                    keyboardActions = KeyboardActions(
                        onNext = { focusManager.moveFocus(FocusDirection.Right) }
                    ),
                    shape = RoundedCornerShape(10.dp),
                    colors = OutlinedTextFieldDefaults.colors(focusedTextColor = TextPrimary, unfocusedTextColor = TextPrimary, focusedContainerColor = BgInput, unfocusedContainerColor = BgInput)
                )
                OutlinedTextField(
                    value = "$targetPercentage",
                    onValueChange = { targetPercentage = it.toIntOrNull() ?: 75 },
                    label = { Text("Target %") },
                    modifier = Modifier.weight(1f),
                    singleLine = true,
                    keyboardOptions = KeyboardOptions(
                        keyboardType = KeyboardType.Number,
                        imeAction = ImeAction.Next
                    ),
                    keyboardActions = KeyboardActions(
                        onNext = { focusManager.moveFocus(FocusDirection.Down) }
                    ),
                    shape = RoundedCornerShape(10.dp),
                    colors = OutlinedTextFieldDefaults.colors(focusedTextColor = TextPrimary, unfocusedTextColor = TextPrimary, focusedContainerColor = BgInput, unfocusedContainerColor = BgInput)
                )
            }

            Spacer(modifier = Modifier.height(14.dp))

            // Faculty & Room
            Row(horizontalArrangement = Arrangement.spacedBy(10.dp)) {
                OutlinedTextField(
                    value = faculty,
                    onValueChange = { faculty = it },
                    label = { Text("Professor / Faculty") },
                    modifier = Modifier.weight(1f),
                    singleLine = true,
                    keyboardOptions = KeyboardOptions(
                        keyboardType = KeyboardType.Text,
                        imeAction = ImeAction.Next,
                        capitalization = KeyboardCapitalization.Words
                    ),
                    keyboardActions = KeyboardActions(
                        onNext = { focusManager.moveFocus(FocusDirection.Right) }
                    ),
                    shape = RoundedCornerShape(10.dp),
                    colors = OutlinedTextFieldDefaults.colors(focusedTextColor = TextPrimary, unfocusedTextColor = TextPrimary, focusedContainerColor = BgInput, unfocusedContainerColor = BgInput)
                )
                OutlinedTextField(
                    value = room,
                    onValueChange = { room = it },
                    label = { Text("Room / Hall") },
                    modifier = Modifier.weight(1f),
                    singleLine = true,
                    keyboardOptions = KeyboardOptions(
                        keyboardType = KeyboardType.Text,
                        imeAction = ImeAction.Done
                    ),
                    keyboardActions = KeyboardActions(
                        onDone = { focusManager.clearFocus() }
                    ),
                    shape = RoundedCornerShape(10.dp),
                    colors = OutlinedTextFieldDefaults.colors(focusedTextColor = TextPrimary, unfocusedTextColor = TextPrimary, focusedContainerColor = BgInput, unfocusedContainerColor = BgInput)
                )
            }

            Spacer(modifier = Modifier.height(14.dp))

            // Color Palette
            Text("Course Accent Color:", fontSize = 12.sp, color = TextSecondary)
            Spacer(modifier = Modifier.height(6.dp))

            Row(horizontalArrangement = Arrangement.spacedBy(10.dp)) {
                colorPalette.forEach { c ->
                    val isSelected = color.equals(c, ignoreCase = true)
                    Box(
                        modifier = Modifier
                            .size(32.dp)
                            .clip(CircleShape)
                            .background(Color(android.graphics.Color.parseColor(c)))
                            .border(if (isSelected) 2.dp else 0.dp, Color.White, CircleShape)
                            .clickable { color = c }
                    )
                }
            }

            Spacer(modifier = Modifier.height(20.dp))

            Button(
                onClick = {
                    if (name.isNotBlank() && code.isNotBlank()) {
                        onSave(code, name, faculty, room, color, targetPercentage, attended, total, workingDays, startDate, lectureTime)
                    }
                },
                shape = RoundedCornerShape(10.dp),
                colors = ButtonDefaults.buttonColors(containerColor = AccentIndigo),
                modifier = Modifier.fillMaxWidth().height(48.dp)
            ) {
                Text(if (subject != null) "Save Changes" else "Enroll Course")
            }
            Spacer(modifier = Modifier.height(48.dp))
        }
    }
}
