package com.bunkpulse.android.ui.subjects

import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.text.KeyboardActions
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.platform.LocalFocusManager
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.input.ImeAction
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.bunkpulse.android.core.designsystem.components.GlassCard
import com.bunkpulse.android.core.designsystem.theme.*
import com.bunkpulse.android.domain.model.User

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun ProfileSettingsSheet(
    user: User?,
    serverUrl: String,
    onDismiss: () -> Unit,
    onOpenServerConfig: () -> Unit,
    onReconcileToday: () -> Unit,
    onUpdateProfile: (String, Int) -> Unit,
    onLogout: () -> Unit
) {
    var name by remember { mutableStateOf(user?.name ?: "") }
    var targetAttendance by remember { mutableStateOf(user?.targetAttendance ?: 75) }
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
                    Box(
                        modifier = Modifier
                            .size(36.dp)
                            .clip(CircleShape)
                            .background(AccentIndigo.copy(alpha = 0.2f)),
                        contentAlignment = Alignment.Center
                    ) {
                        Icon(Icons.Default.Person, contentDescription = null, tint = AccentIndigo, modifier = Modifier.size(20.dp))
                    }
                    Column {
                        Text(user?.name ?: "Student Profile", style = Typography.titleLarge, color = TextPrimary)
                        Text(user?.email ?: "", color = TextSecondary, fontSize = 11.sp)
                    }
                }
                IconButton(onClick = onDismiss) {
                    Icon(Icons.Default.Close, contentDescription = "Close", tint = TextMuted)
                }
            }

            Spacer(modifier = Modifier.height(16.dp))

            // Edit Profile Name & Target
            OutlinedTextField(
                value = name,
                onValueChange = { name = it },
                label = { Text("Display Name") },
                modifier = Modifier.fillMaxWidth(),
                singleLine = true,
                keyboardOptions = KeyboardOptions(
                    keyboardType = KeyboardType.Text,
                    imeAction = ImeAction.Done
                ),
                keyboardActions = KeyboardActions(
                    onDone = {
                        focusManager.clearFocus()
                        onUpdateProfile(name, targetAttendance)
                    }
                ),
                shape = RoundedCornerShape(10.dp),
                colors = OutlinedTextFieldDefaults.colors(focusedTextColor = TextPrimary, unfocusedTextColor = TextPrimary, focusedContainerColor = BgInput, unfocusedContainerColor = BgInput)
            )

            Spacer(modifier = Modifier.height(10.dp))

            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically
            ) {
                Text("Default Target Attendance:", fontSize = 12.sp, color = TextSecondary)
                Text("$targetAttendance%", fontSize = 14.sp, fontWeight = FontWeight.Bold, color = SafeEmerald)
            }

            Slider(
                value = targetAttendance.toFloat(),
                onValueChange = { targetAttendance = it.toInt() },
                valueRange = 60f..95f,
                steps = 34,
                colors = SliderDefaults.colors(thumbColor = AccentIndigo, activeTrackColor = AccentIndigo)
            )

            Button(
                onClick = { onUpdateProfile(name, targetAttendance) },
                shape = RoundedCornerShape(10.dp),
                colors = ButtonDefaults.buttonColors(containerColor = AccentIndigo),
                modifier = Modifier.fillMaxWidth()
            ) {
                Text("Save Profile Changes")
            }

            Spacer(modifier = Modifier.height(16.dp))
            Divider(color = BorderSubtle)
            Spacer(modifier = Modifier.height(16.dp))

            // Server Connection Switcher Action
            GlassCard(
                modifier = Modifier
                    .fillMaxWidth()
                    .clickable { onOpenServerConfig() },
                backgroundColor = BgInput
            ) {
                Row(
                    modifier = Modifier.padding(14.dp),
                    verticalAlignment = Alignment.CenterVertically,
                    horizontalArrangement = Arrangement.SpaceBetween
                ) {
                    Row(
                        verticalAlignment = Alignment.CenterVertically,
                        horizontalArrangement = Arrangement.spacedBy(10.dp)
                    ) {
                        Icon(Icons.Default.Dns, contentDescription = null, tint = AccentCyan, modifier = Modifier.size(20.dp))
                        Column {
                            Text("Server Base URL", fontWeight = FontWeight.Bold, color = TextPrimary, fontSize = 13.sp)
                            Text(serverUrl, color = TextSecondary, fontSize = 11.sp)
                        }
                    }
                    Icon(Icons.Default.ChevronRight, contentDescription = null, tint = TextMuted)
                }
            }

            Spacer(modifier = Modifier.height(10.dp))

            // Reconcile Schedule Button (Scoped to current user)
            OutlinedButton(
                onClick = onReconcileToday,
                shape = RoundedCornerShape(10.dp),
                colors = ButtonDefaults.outlinedButtonColors(contentColor = SafeEmerald),
                modifier = Modifier.fillMaxWidth()
            ) {
                Icon(Icons.Default.Sync, contentDescription = null, modifier = Modifier.size(16.dp))
                Spacer(modifier = Modifier.width(6.dp))
                Text("Reconcile Today's Schedule (Sync 5PM)")
            }

            Spacer(modifier = Modifier.height(10.dp))

            // Logout Button
            Button(
                onClick = onLogout,
                shape = RoundedCornerShape(10.dp),
                colors = ButtonDefaults.buttonColors(containerColor = CriticalRose.copy(alpha = 0.2f), contentColor = CriticalRose),
                modifier = Modifier.fillMaxWidth()
            ) {
                Icon(Icons.Default.Logout, contentDescription = null, modifier = Modifier.size(16.dp))
                Spacer(modifier = Modifier.width(6.dp))
                Text("Sign Out")
            }

            Spacer(modifier = Modifier.height(48.dp))
        }
    }
}
