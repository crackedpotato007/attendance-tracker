package com.bunkpulse.android.ui.schedule

import android.Manifest
import android.widget.Toast
import androidx.activity.compose.rememberLauncherForActivityResult
import androidx.activity.result.contract.ActivityResultContracts
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.text.KeyboardActions
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.focus.FocusDirection
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.platform.LocalFocusManager
import androidx.compose.ui.text.font.FontFamily
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.input.ImeAction
import androidx.compose.ui.text.input.KeyboardCapitalization
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.compose.ui.window.Dialog
import com.bunkpulse.android.core.designsystem.components.GlassCard
import com.bunkpulse.android.core.designsystem.components.StatusBadge
import com.bunkpulse.android.core.designsystem.theme.*
import com.bunkpulse.android.core.location.LocationHelper
import java.time.LocalDate
import java.time.format.DateTimeFormatter

@Composable
fun ScheduleScreen(
    viewModel: ScheduleViewModel
) {
    val uiState by viewModel.uiState.collectAsState()
    val context = LocalContext.current
    val focusManager = LocalFocusManager.current

    // Location permission request launcher
    val locationPermissionLauncher = rememberLauncherForActivityResult(
        contract = ActivityResultContracts.RequestMultiplePermissions()
    ) { permissions ->
        val granted = permissions[Manifest.permission.ACCESS_FINE_LOCATION] == true ||
                permissions[Manifest.permission.ACCESS_COARSE_LOCATION] == true
        if (granted) {
            viewModel.useCurrentLocationAsCampus(context)
        } else {
            Toast.makeText(context, "Location permission denied", Toast.LENGTH_SHORT).show()
        }
    }

    val verifyLocationPermissionLauncher = rememberLauncherForActivityResult(
        contract = ActivityResultContracts.RequestMultiplePermissions()
    ) { permissions ->
        val granted = permissions[Manifest.permission.ACCESS_FINE_LOCATION] == true ||
                permissions[Manifest.permission.ACCESS_COARSE_LOCATION] == true
        if (granted) {
            viewModel.verifyLocationAndMarkNow(context)
        } else {
            Toast.makeText(context, "Location permission denied", Toast.LENGTH_SHORT).show()
        }
    }

    LaunchedEffect(uiState.toastMessage) {
        uiState.toastMessage?.let {
            Toast.makeText(context, it, Toast.LENGTH_SHORT).show()
            viewModel.clearToast()
        }
    }

    // Modal Sheet for Day Attendance
    if (uiState.activeDateModal != null) {
        val dateStr = uiState.activeDateModal!!
        val dateObj = try { LocalDate.parse(dateStr) } catch (_: Exception) { LocalDate.now() }
        val dayOfWeek = dateObj.dayOfWeek.value % 7
        val isWorkingDay = uiState.config.activeDays.contains(dayOfWeek)
        val holiday = uiState.config.customHolidays.find { it.isInHoliday(dateStr) }
        val dateLogs = uiState.monthlyLogs.filter { it.date == dateStr }

        DayAttendanceEditorSheet(
            dateStr = dateStr,
            subjects = uiState.subjects,
            logsForDate = dateLogs,
            holiday = holiday,
            isWorkingDay = isWorkingDay,
            onDismiss = { viewModel.closeDateModal() },
            onLogSubject = { id, name, status -> viewModel.logDayAttendance(id, name, status) },
            onDeleteLog = { viewModel.deleteDayLog(it) }
        )
    }

    // Geofence Verification Outcome Dialog
    if (uiState.verificationDialogData != null) {
        val data = uiState.verificationDialogData!!
        Dialog(onDismissRequest = { viewModel.dismissVerificationDialog() }) {
            GlassCard(
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(8.dp),
                backgroundColor = BgSurface
            ) {
                Column(
                    modifier = Modifier
                        .fillMaxWidth()
                        .padding(20.dp)
                ) {
                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.SpaceBetween,
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                            Box(
                                modifier = Modifier
                                    .size(36.dp)
                                    .clip(CircleShape)
                                    .background(if (data.isInside) SafeEmerald.copy(alpha = 0.2f) else CriticalRose.copy(alpha = 0.2f)),
                                contentAlignment = Alignment.Center
                            ) {
                                Icon(
                                    imageVector = if (data.isInside) Icons.Default.CheckCircle else Icons.Default.Cancel,
                                    contentDescription = null,
                                    tint = if (data.isInside) SafeEmerald else CriticalRose,
                                    modifier = Modifier.size(22.dp)
                                )
                            }
                            Column {
                                Text(
                                    text = if (data.isInside) "Inside Campus Boundary" else "Outside Campus Boundary",
                                    fontWeight = FontWeight.Bold,
                                    fontSize = 15.sp,
                                    color = if (data.isInside) SafeEmerald else CriticalRose
                                )
                                Text(
                                    text = "${LocationHelper.formatDistance(data.distanceMeters)} from ${data.campusName}",
                                    fontSize = 11.sp,
                                    color = TextSecondary
                                )
                            }
                        }
                        IconButton(onClick = { viewModel.dismissVerificationDialog() }) {
                            Icon(Icons.Default.Close, contentDescription = "Close", tint = TextMuted)
                        }
                    }

                    Spacer(modifier = Modifier.height(14.dp))

                    // Telemetry Card
                    Box(
                        modifier = Modifier
                            .fillMaxWidth()
                            .clip(RoundedCornerShape(10.dp))
                            .background(BgInput)
                            .padding(12.dp)
                    ) {
                        Column(verticalArrangement = Arrangement.spacedBy(6.dp)) {
                            Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween) {
                                Text("Allowed Radius:", fontSize = 11.sp, color = TextMuted)
                                Text("${data.radiusMeters}m", fontSize = 11.sp, fontWeight = FontWeight.Bold, color = TextPrimary)
                            }
                            Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween) {
                                Text("Measured Distance:", fontSize = 11.sp, color = TextMuted)
                                Text(
                                    LocationHelper.formatDistance(data.distanceMeters),
                                    fontSize = 12.sp,
                                    fontWeight = FontWeight.Bold,
                                    color = if (data.isInside) SafeEmerald else CriticalRose
                                )
                            }
                            Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween) {
                                Text("Your GPS Fix:", fontSize = 10.sp, color = TextMuted)
                                Text(
                                    "${data.detectedLat.toString().take(8)}, ${data.detectedLng.toString().take(8)}",
                                    fontSize = 10.sp,
                                    fontFamily = FontFamily.Monospace,
                                    color = TextSecondary
                                )
                            }
                        }
                    }

                    Spacer(modifier = Modifier.height(14.dp))
                    Text("Today's Course Evaluations:", fontWeight = FontWeight.Bold, fontSize = 12.sp, color = TextPrimary)
                    Spacer(modifier = Modifier.height(8.dp))

                    if (data.evaluatedCourses.isEmpty()) {
                        Text("No courses enrolled yet.", fontSize = 11.sp, color = TextMuted)
                    } else {
                        Column(verticalArrangement = Arrangement.spacedBy(6.dp)) {
                            data.evaluatedCourses.forEach { course ->
                                Row(
                                    modifier = Modifier
                                        .fillMaxWidth()
                                        .clip(RoundedCornerShape(8.dp))
                                        .background(BgInput)
                                        .padding(horizontal = 10.dp, vertical = 8.dp),
                                    horizontalArrangement = Arrangement.SpaceBetween,
                                    verticalAlignment = Alignment.CenterVertically
                                ) {
                                    Column(modifier = Modifier.weight(1f)) {
                                        Text("${course.code} • ${course.name}", fontWeight = FontWeight.Bold, fontSize = 12.sp, color = TextPrimary)
                                        Text(course.message, fontSize = 10.sp, color = TextSecondary)
                                    }
                                    Spacer(modifier = Modifier.width(6.dp))
                                    when (course.status) {
                                        "PRESENT" -> StatusBadge(text = "Present ✓", color = SafeEmerald)
                                        "ABSENT" -> StatusBadge(text = "Absent ✗", color = CriticalRose)
                                        "ALREADY_LOGGED" -> StatusBadge(text = "Logged", color = AccentCyan)
                                        else -> StatusBadge(text = "Off Today", color = TextMuted)
                                    }
                                }
                            }
                        }
                    }

                    Spacer(modifier = Modifier.height(18.dp))

                    Button(
                        onClick = { viewModel.dismissVerificationDialog() },
                        colors = ButtonDefaults.buttonColors(containerColor = AccentIndigo),
                        shape = RoundedCornerShape(10.dp),
                        modifier = Modifier.fillMaxWidth()
                    ) {
                        Text("Done & Refresh")
                    }
                }
            }
        }
    }

    Box(modifier = Modifier.fillMaxSize().background(BgMain).imePadding()) {
        LazyColumn(
            modifier = Modifier.fillMaxSize(),
            contentPadding = PaddingValues(start = 16.dp, top = 16.dp, end = 16.dp, bottom = 96.dp),
            verticalArrangement = Arrangement.spacedBy(16.dp)
        ) {
            // 1. Campus Geofence & Location Auto-Attendance Card
            item {
                val geofence = uiState.config.campusGeofence
                var campusName by remember(geofence.name) { mutableStateOf(geofence.name) }
                var campusLatStr by remember(geofence.latitude) { mutableStateOf(if (geofence.latitude != 0.0) geofence.latitude.toString() else "") }
                var campusLngStr by remember(geofence.longitude) { mutableStateOf(if (geofence.longitude != 0.0) geofence.longitude.toString() else "") }
                var radiusMeters by remember(geofence.radiusMeters) { mutableStateOf(geofence.radiusMeters) }
                var isEnabled by remember(geofence.isEnabled) { mutableStateOf(geofence.isEnabled) }

                LaunchedEffect(geofence.latitude, geofence.longitude) {
                    if (geofence.latitude != 0.0) campusLatStr = geofence.latitude.toString()
                    if (geofence.longitude != 0.0) campusLngStr = geofence.longitude.toString()
                }

                GlassCard(modifier = Modifier.fillMaxWidth(), backgroundColor = BgSurface) {
                    Column(modifier = Modifier.padding(18.dp)) {
                        Row(
                            modifier = Modifier.fillMaxWidth(),
                            horizontalArrangement = Arrangement.SpaceBetween,
                            verticalAlignment = Alignment.CenterVertically
                        ) {
                            Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                                Icon(Icons.Default.LocationOn, contentDescription = null, tint = AccentCyan)
                                Column {
                                    Text("Campus Geofence", style = Typography.titleMedium, color = TextPrimary)
                                    Text("Location-based auto-attendance", color = TextSecondary, fontSize = 11.sp)
                                }
                            }
                            Switch(
                                checked = isEnabled,
                                onCheckedChange = { checked ->
                                    isEnabled = checked
                                    val lat = campusLatStr.toDoubleOrNull() ?: geofence.latitude
                                    val lng = campusLngStr.toDoubleOrNull() ?: geofence.longitude
                                    viewModel.updateCampusGeofence(campusName, lat, lng, radiusMeters, checked)
                                },
                                colors = SwitchDefaults.colors(
                                    checkedThumbColor = Color.White,
                                    checkedTrackColor = AccentCyan,
                                    uncheckedThumbColor = TextMuted,
                                    uncheckedTrackColor = BgInput
                                )
                            )
                        }

                        Spacer(modifier = Modifier.height(10.dp))

                        Text(
                            "Pin your college coordinates and set a radius. At class time, BunkPulse checks your distance: inside radius = Present, outside = Absent.",
                            fontSize = 11.sp,
                            color = TextMuted
                        )

                        // Live status badge if configured
                        if (geofence.isConfigured) {
                            Spacer(modifier = Modifier.height(10.dp))
                            Box(
                                modifier = Modifier
                                    .fillMaxWidth()
                                    .clip(RoundedCornerShape(8.dp))
                                    .background(BgInput)
                                    .padding(horizontal = 10.dp, vertical = 8.dp)
                            ) {
                                Row(
                                    modifier = Modifier.fillMaxWidth(),
                                    horizontalArrangement = Arrangement.SpaceBetween,
                                    verticalAlignment = Alignment.CenterVertically
                                ) {
                                    Column {
                                        Text("Target Campus Pinned:", fontSize = 10.sp, color = TextMuted)
                                        Text("${geofence.latitude.toString().take(8)}, ${geofence.longitude.toString().take(8)}", fontSize = 11.sp, fontWeight = FontWeight.Bold, color = TextPrimary, fontFamily = FontFamily.Monospace)
                                    }
                                    StatusBadge(text = "${geofence.radiusMeters}m radius", color = AccentCyan)
                                }
                            }
                        }

                        Spacer(modifier = Modifier.height(14.dp))

                        // Campus Name
                        OutlinedTextField(
                            value = campusName,
                            onValueChange = { campusName = it },
                            label = { Text("College / Campus Name") },
                            modifier = Modifier.fillMaxWidth(),
                            singleLine = true,
                            keyboardOptions = KeyboardOptions(
                                keyboardType = KeyboardType.Text,
                                imeAction = ImeAction.Next,
                                capitalization = KeyboardCapitalization.Words
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

                        Spacer(modifier = Modifier.height(10.dp))

                        // Latitude and Longitude
                        Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                            OutlinedTextField(
                                value = campusLatStr,
                                onValueChange = { campusLatStr = it },
                                label = { Text("Latitude") },
                                placeholder = { Text("e.g. 28.545") },
                                modifier = Modifier.weight(1f),
                                singleLine = true,
                                keyboardOptions = KeyboardOptions(
                                    keyboardType = KeyboardType.Decimal,
                                    imeAction = ImeAction.Next
                                ),
                                keyboardActions = KeyboardActions(
                                    onNext = { focusManager.moveFocus(FocusDirection.Right) }
                                ),
                                shape = RoundedCornerShape(10.dp),
                                colors = OutlinedTextFieldDefaults.colors(focusedTextColor = TextPrimary, unfocusedTextColor = TextPrimary, focusedContainerColor = BgInput, unfocusedContainerColor = BgInput)
                            )
                            OutlinedTextField(
                                value = campusLngStr,
                                onValueChange = { campusLngStr = it },
                                label = { Text("Longitude") },
                                placeholder = { Text("e.g. 77.192") },
                                modifier = Modifier.weight(1f),
                                singleLine = true,
                                keyboardOptions = KeyboardOptions(
                                    keyboardType = KeyboardType.Decimal,
                                    imeAction = ImeAction.Done
                                ),
                                keyboardActions = KeyboardActions(
                                    onDone = { focusManager.clearFocus() }
                                ),
                                shape = RoundedCornerShape(10.dp),
                                colors = OutlinedTextFieldDefaults.colors(focusedTextColor = TextPrimary, unfocusedTextColor = TextPrimary, focusedContainerColor = BgInput, unfocusedContainerColor = BgInput)
                            )
                        }

                        Spacer(modifier = Modifier.height(12.dp))

                        // Geofence Radius Slider
                        Row(
                            modifier = Modifier.fillMaxWidth(),
                            horizontalArrangement = Arrangement.SpaceBetween,
                            verticalAlignment = Alignment.CenterVertically
                        ) {
                            Text("Geofence Radius:", fontSize = 12.sp, color = TextSecondary)
                            Text(LocationHelper.formatDistance(radiusMeters.toFloat()), fontSize = 13.sp, fontWeight = FontWeight.Bold, color = AccentCyan)
                        }

                        Slider(
                            value = radiusMeters.toFloat(),
                            onValueChange = { radiusMeters = it.toInt() },
                            valueRange = 50f..1000f,
                            steps = 19,
                            colors = SliderDefaults.colors(thumbColor = AccentCyan, activeTrackColor = AccentCyan)
                        )

                        // Action Buttons: Capture Current GPS & Save
                        Row(
                            modifier = Modifier.fillMaxWidth(),
                            horizontalArrangement = Arrangement.spacedBy(8.dp)
                        ) {
                            OutlinedButton(
                                onClick = {
                                    if (LocationHelper.hasLocationPermission(context)) {
                                        viewModel.useCurrentLocationAsCampus(context)
                                    } else {
                                        locationPermissionLauncher.launch(
                                            arrayOf(
                                                Manifest.permission.ACCESS_FINE_LOCATION,
                                                Manifest.permission.ACCESS_COARSE_LOCATION
                                            )
                                        )
                                    }
                                },
                                shape = RoundedCornerShape(10.dp),
                                colors = ButtonDefaults.outlinedButtonColors(contentColor = AccentCyan),
                                modifier = Modifier.weight(1f)
                            ) {
                                Icon(Icons.Default.MyLocation, contentDescription = null, modifier = Modifier.size(16.dp))
                                Spacer(modifier = Modifier.width(4.dp))
                                Text("Pin Current GPS", fontSize = 11.sp, fontWeight = FontWeight.Bold)
                            }

                            Button(
                                onClick = {
                                    focusManager.clearFocus()
                                    val lat = campusLatStr.toDoubleOrNull() ?: 0.0
                                    val lng = campusLngStr.toDoubleOrNull() ?: 0.0
                                    viewModel.updateCampusGeofence(campusName, lat, lng, radiusMeters, isEnabled)
                                },
                                shape = RoundedCornerShape(10.dp),
                                colors = ButtonDefaults.buttonColors(containerColor = AccentIndigo),
                                modifier = Modifier.weight(1f)
                            ) {
                                Icon(Icons.Default.Save, contentDescription = null, modifier = Modifier.size(16.dp))
                                Spacer(modifier = Modifier.width(4.dp))
                                Text("Save Geofence", fontSize = 11.sp)
                            }
                        }

                        Spacer(modifier = Modifier.height(10.dp))

                        // Test & Check In Now Button (Shows detailed modal dialog)
                        Button(
                            onClick = {
                                if (LocationHelper.hasLocationPermission(context)) {
                                    viewModel.verifyLocationAndMarkNow(context)
                                } else {
                                    verifyLocationPermissionLauncher.launch(
                                        arrayOf(
                                            Manifest.permission.ACCESS_FINE_LOCATION,
                                            Manifest.permission.ACCESS_COARSE_LOCATION
                                        )
                                    )
                                }
                            },
                            shape = RoundedCornerShape(10.dp),
                            colors = ButtonDefaults.buttonColors(containerColor = SafeEmerald, contentColor = Color.Black),
                            modifier = Modifier.fillMaxWidth().height(44.dp)
                        ) {
                            Icon(Icons.Default.CheckCircle, contentDescription = null, modifier = Modifier.size(18.dp))
                            Spacer(modifier = Modifier.width(6.dp))
                            Text("⚡ Verify Location & Auto-Mark Now", fontWeight = FontWeight.Bold, fontSize = 12.sp)
                        }
                    }
                }
            }

            // 2. Working Days Customizer Card
            item {
                GlassCard(modifier = Modifier.fillMaxWidth(), backgroundColor = BgSurface) {
                    Column(modifier = Modifier.padding(18.dp)) {
                        Row(
                            modifier = Modifier.fillMaxWidth(),
                            horizontalArrangement = Arrangement.SpaceBetween,
                            verticalAlignment = Alignment.CenterVertically
                        ) {
                            Text("Custom Working Days", style = Typography.titleMedium, color = TextPrimary)
                            StatusBadge(text = "${uiState.config.activeDays.size} Days/Wk", color = SafeEmerald)
                        }

                        Spacer(modifier = Modifier.height(12.dp))

                        val daysList = listOf(
                            Pair(1, "Mon"), Pair(2, "Tue"), Pair(3, "Wed"),
                            Pair(4, "Thu"), Pair(5, "Fri"), Pair(6, "Sat"), Pair(0, "Sun")
                        )

                        Row(
                            modifier = Modifier.fillMaxWidth(),
                            horizontalArrangement = Arrangement.SpaceBetween
                        ) {
                            daysList.forEach { (idx, shortName) ->
                                val active = uiState.config.activeDays.contains(idx)
                                Box(
                                    modifier = Modifier
                                        .size(42.dp)
                                        .clip(RoundedCornerShape(8.dp))
                                        .background(if (active) AccentIndigo else BgInput)
                                        .border(1.dp, if (active) AccentIndigo else BorderSubtle, RoundedCornerShape(8.dp))
                                        .clickable { viewModel.toggleDay(idx) },
                                    contentAlignment = Alignment.Center
                                ) {
                                    Text(
                                        text = shortName,
                                        color = if (active) Color.White else TextSecondary,
                                        fontSize = 11.sp,
                                        fontWeight = FontWeight.Bold
                                    )
                                }
                            }
                        }

                        Spacer(modifier = Modifier.height(14.dp))

                        // Presets
                        Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                            PresetBtn("6-Day (Mon–Sat)") { viewModel.applyPreset(listOf(1, 2, 3, 4, 5, 6)) }
                            PresetBtn("5-Day (Mon–Fri)") { viewModel.applyPreset(listOf(1, 2, 3, 4, 5)) }
                            PresetBtn("All 7 Days") { viewModel.applyPreset(listOf(0, 1, 2, 3, 4, 5, 6)) }
                        }
                    }
                }
            }

            // 3. Interactive Monthly Calendar Matrix Card
            item {
                GlassCard(modifier = Modifier.fillMaxWidth(), backgroundColor = BgSurface) {
                    Column(modifier = Modifier.padding(18.dp)) {
                        // Month Header Navigation
                        Row(
                            modifier = Modifier.fillMaxWidth(),
                            horizontalArrangement = Arrangement.SpaceBetween,
                            verticalAlignment = Alignment.CenterVertically
                        ) {
                            Column {
                                Text(
                                    text = uiState.currentYearMonth.format(DateTimeFormatter.ofPattern("MMMM yyyy")),
                                    style = Typography.titleLarge,
                                    color = TextPrimary
                                )
                                Text("Tap any day to modify or backfill", color = TextSecondary, fontSize = 11.sp)
                            }

                            Row {
                                IconButton(onClick = { viewModel.changeMonth(-1) }) {
                                    Icon(Icons.Default.ChevronLeft, contentDescription = "Prev Month", tint = TextPrimary)
                                }
                                IconButton(onClick = { viewModel.changeMonth(1) }) {
                                    Icon(Icons.Default.ChevronRight, contentDescription = "Next Month", tint = TextPrimary)
                                }
                            }
                        }

                        Spacer(modifier = Modifier.height(12.dp))

                        // Weekday labels
                        Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween) {
                            listOf("Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat").forEach { d ->
                                Box(modifier = Modifier.weight(1f), contentAlignment = Alignment.Center) {
                                    Text(d, color = TextMuted, fontSize = 11.sp, fontWeight = FontWeight.Bold)
                                }
                            }
                        }

                        Spacer(modifier = Modifier.height(8.dp))

                        // Calendar Matrix Days
                        val yearMonth = uiState.currentYearMonth
                        val firstDayOfWeek = yearMonth.atDay(1).dayOfWeek.value % 7 // 0 = Sun
                        val daysInMonth = yearMonth.lengthOfMonth()
                        val todayStr = LocalDate.now().toString()

                        var currentDay = 1
                        val totalCells = ((firstDayOfWeek + daysInMonth + 6) / 7) * 7

                        Column(verticalArrangement = Arrangement.spacedBy(6.dp)) {
                            for (week in 0 until (totalCells / 7)) {
                                Row(
                                    modifier = Modifier.fillMaxWidth(),
                                    horizontalArrangement = Arrangement.SpaceBetween
                                ) {
                                    for (dayIdx in 0..6) {
                                        val cellIndex = week * 7 + dayIdx
                                        if (cellIndex < firstDayOfWeek || currentDay > daysInMonth) {
                                            Box(modifier = Modifier.weight(1f).height(46.dp))
                                        } else {
                                            val dateStr = yearMonth.atDay(currentDay).toString()
                                            val isToday = dateStr == todayStr
                                            val isWorking = uiState.config.activeDays.contains(dayIdx)
                                            val holiday = uiState.config.customHolidays.find { it.isInHoliday(dateStr) }
                                            val dateLogs = uiState.monthlyLogs.filter { it.date == dateStr }

                                            val presentCount = dateLogs.count { it.status.value == "present" }
                                            val absentCount = dateLogs.count { it.status.value == "absent" }

                                            Box(
                                                modifier = Modifier
                                                    .weight(1f)
                                                    .height(46.dp)
                                                    .padding(2.dp)
                                                    .clip(RoundedCornerShape(8.dp))
                                                    .background(
                                                        when {
                                                            holiday != null -> HolidayPurple.copy(alpha = 0.2f)
                                                            isToday -> AccentIndigo.copy(alpha = 0.25f)
                                                            else -> BgInput
                                                        }
                                                    )
                                                    .border(
                                                        1.dp,
                                                        when {
                                                            isToday -> AccentIndigo
                                                            holiday != null -> HolidayPurple.copy(alpha = 0.4f)
                                                            else -> BorderSubtle
                                                        },
                                                        RoundedCornerShape(8.dp)
                                                    )
                                                    .clickable { viewModel.openDateModal(dateStr) },
                                                contentAlignment = Alignment.Center
                                            ) {
                                                Column(horizontalAlignment = Alignment.CenterHorizontally) {
                                                    Text(
                                                        text = "$currentDay",
                                                        fontSize = 11.sp,
                                                        fontWeight = if (isToday) FontWeight.ExtraBold else FontWeight.Medium,
                                                        color = when {
                                                            holiday != null -> HolidayPurple
                                                            isToday -> Color.White
                                                            isWorking -> TextPrimary
                                                            else -> TextMuted
                                                        }
                                                    )
                                                    if (presentCount > 0 || absentCount > 0) {
                                                        Row(horizontalArrangement = Arrangement.spacedBy(2.dp)) {
                                                            if (presentCount > 0) {
                                                                Box(modifier = Modifier.size(4.dp).clip(CircleShape).background(SafeEmerald))
                                                            }
                                                            if (absentCount > 0) {
                                                                Box(modifier = Modifier.size(4.dp).clip(CircleShape).background(CriticalRose))
                                                            }
                                                        }
                                                    }
                                                }
                                            }
                                            currentDay++
                                        }
                                    }
                                }
                            }
                        }
                    }
                }
            }

            // 4. College Holidays & Fests Manager Card
            item {
                var holidayName by remember { mutableStateOf("") }
                var startDate by remember { mutableStateOf(LocalDate.now().toString()) }
                var endDate by remember { mutableStateOf(LocalDate.now().toString()) }

                GlassCard(modifier = Modifier.fillMaxWidth(), backgroundColor = BgSurface) {
                    Column(modifier = Modifier.padding(18.dp)) {
                        Row(
                            modifier = Modifier.fillMaxWidth(),
                            horizontalArrangement = Arrangement.SpaceBetween,
                            verticalAlignment = Alignment.CenterVertically
                        ) {
                            Text("College Holidays & Fests", style = Typography.titleMedium, color = TextPrimary)
                            StatusBadge(text = "${uiState.config.customHolidays.size} Added", color = HolidayPurple)
                        }

                        Spacer(modifier = Modifier.height(12.dp))

                        OutlinedTextField(
                            value = holidayName,
                            onValueChange = { holidayName = it },
                            label = { Text("Fest / Holiday Name") },
                            modifier = Modifier.fillMaxWidth(),
                            singleLine = true,
                            keyboardOptions = KeyboardOptions(
                                keyboardType = KeyboardType.Text,
                                imeAction = ImeAction.Next,
                                capitalization = KeyboardCapitalization.Words
                            ),
                            keyboardActions = KeyboardActions(
                                onNext = { focusManager.moveFocus(FocusDirection.Down) }
                            ),
                            shape = RoundedCornerShape(10.dp),
                            colors = OutlinedTextFieldDefaults.colors(
                                focusedTextColor = TextPrimary,
                                unfocusedTextColor = TextPrimary,
                                focusedBorderColor = HolidayPurple,
                                focusedContainerColor = BgInput,
                                unfocusedContainerColor = BgInput
                            )
                        )

                        Spacer(modifier = Modifier.height(10.dp))

                        Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                            OutlinedTextField(
                                value = startDate,
                                onValueChange = { startDate = it },
                                label = { Text("Start Date") },
                                modifier = Modifier.weight(1f),
                                singleLine = true,
                                keyboardOptions = KeyboardOptions(
                                    keyboardType = KeyboardType.Text,
                                    imeAction = ImeAction.Next
                                ),
                                keyboardActions = KeyboardActions(
                                    onNext = { focusManager.moveFocus(FocusDirection.Right) }
                                ),
                                shape = RoundedCornerShape(10.dp),
                                colors = OutlinedTextFieldDefaults.colors(focusedTextColor = TextPrimary, unfocusedTextColor = TextPrimary, focusedContainerColor = BgInput, unfocusedContainerColor = BgInput)
                            )
                            OutlinedTextField(
                                value = endDate,
                                onValueChange = { endDate = it },
                                label = { Text("End Date") },
                                modifier = Modifier.weight(1f),
                                singleLine = true,
                                keyboardOptions = KeyboardOptions(
                                    keyboardType = KeyboardType.Text,
                                    imeAction = ImeAction.Done
                                ),
                                keyboardActions = KeyboardActions(
                                    onDone = {
                                        focusManager.clearFocus()
                                        if (holidayName.isNotBlank()) {
                                            viewModel.addHoliday(holidayName, startDate, endDate)
                                            holidayName = ""
                                        }
                                    }
                                ),
                                shape = RoundedCornerShape(10.dp),
                                colors = OutlinedTextFieldDefaults.colors(focusedTextColor = TextPrimary, unfocusedTextColor = TextPrimary, focusedContainerColor = BgInput, unfocusedContainerColor = BgInput)
                            )
                        }

                        Spacer(modifier = Modifier.height(12.dp))

                        Button(
                            onClick = {
                                if (holidayName.isNotBlank()) {
                                    viewModel.addHoliday(holidayName, startDate, endDate)
                                    holidayName = ""
                                }
                            },
                            shape = RoundedCornerShape(10.dp),
                            colors = ButtonDefaults.buttonColors(containerColor = HolidayPurple),
                            modifier = Modifier.fillMaxWidth()
                        ) {
                            Icon(Icons.Default.Add, contentDescription = null, modifier = Modifier.size(16.dp))
                            Spacer(modifier = Modifier.width(6.dp))
                            Text("Add Fest / Holiday")
                        }

                        if (uiState.config.customHolidays.isNotEmpty()) {
                            Spacer(modifier = Modifier.height(14.dp))
                            Text("Active Holidays:", fontSize = 11.sp, color = TextMuted)
                            Spacer(modifier = Modifier.height(6.dp))

                            uiState.config.customHolidays.forEach { hol ->
                                Row(
                                    modifier = Modifier
                                        .fillMaxWidth()
                                        .padding(vertical = 4.dp),
                                    horizontalArrangement = Arrangement.SpaceBetween,
                                    verticalAlignment = Alignment.CenterVertically
                                ) {
                                    Column {
                                        Text(hol.name, color = TextPrimary, fontWeight = FontWeight.Bold, fontSize = 12.sp)
                                        Text("${hol.startDate} → ${hol.endDate}", color = TextSecondary, fontSize = 10.sp, fontFamily = FontFamily.Monospace)
                                    }
                                    IconButton(onClick = { viewModel.removeHoliday(hol.id) }) {
                                        Icon(Icons.Default.Delete, contentDescription = "Delete", tint = CriticalRose, modifier = Modifier.size(16.dp))
                                    }
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
private fun PresetBtn(label: String, onClick: () -> Unit) {
    Box(
        modifier = Modifier
            .background(BgInput, RoundedCornerShape(8.dp))
            .border(1.dp, BorderSubtle, RoundedCornerShape(8.dp))
            .clickable { onClick() }
            .padding(horizontal = 8.dp, vertical = 5.dp)
    ) {
        Text(label, color = TextSecondary, fontSize = 10.sp, fontWeight = FontWeight.Medium)
    }
}
