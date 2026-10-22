package com.bunkpulse.android.core.designsystem.components

import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.text.KeyboardActions
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.CheckCircle
import androidx.compose.material.icons.filled.Dns
import androidx.compose.material.icons.filled.Error
import androidx.compose.material.icons.filled.Speed
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.platform.LocalFocusManager
import androidx.compose.ui.text.font.FontFamily
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.input.ImeAction
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.compose.ui.window.Dialog
import androidx.compose.ui.window.DialogProperties
import com.bunkpulse.android.core.designsystem.theme.*
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.launch
import kotlinx.coroutines.withContext
import okhttp3.OkHttpClient
import okhttp3.Request
import java.util.concurrent.TimeUnit

@Composable
fun ServerConfigDialog(
    currentUrl: String,
    onDismiss: () -> Unit,
    onSaveUrl: (String) -> Unit
) {
    var inputUrl by remember { mutableStateOf(currentUrl) }
    var testStatus by remember { mutableStateOf<String?>(null) }
    var isSuccess by remember { mutableStateOf<Boolean?>(null) }
    var isTesting by remember { mutableStateOf(false) }
    val scope = rememberCoroutineScope()
    val focusManager = LocalFocusManager.current

    Dialog(
        onDismissRequest = onDismiss,
        properties = DialogProperties(decorFitsSystemWindows = false)
    ) {
        GlassCard(
            modifier = Modifier
                .fillMaxWidth()
                .padding(8.dp)
                .imePadding(),
            backgroundColor = BgSurface,
            shape = RoundedCornerShape(20.dp)
        ) {
            Column(
                modifier = Modifier
                    .fillMaxWidth()
                    .verticalScroll(rememberScrollState())
                    .padding(20.dp)
            ) {
                Row(
                    verticalAlignment = Alignment.CenterVertically,
                    horizontalArrangement = Arrangement.spacedBy(10.dp)
                ) {
                    Icon(Icons.Default.Dns, contentDescription = null, tint = AccentIndigo)
                    Column {
                        Text("Server Connection", style = Typography.titleLarge, color = TextPrimary)
                        Text("Connect client to your central API", style = Typography.bodyMedium, color = TextSecondary)
                    }
                }

                Spacer(modifier = Modifier.height(16.dp))

                Text("Quick Presets:", style = Typography.labelSmall, color = TextMuted)
                Spacer(modifier = Modifier.height(6.dp))

                Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                    PresetChip(label = "Emulator (10.0.2.2)") {
                        inputUrl = "https://attendance.310706.xyz/api"
                        testStatus = null
                    }
                    PresetChip(label = "Local (localhost)") {
                        inputUrl = "http://localhost:3000/api"
                        testStatus = null
                    }
                }

                Spacer(modifier = Modifier.height(14.dp))

                Text("Server Base URL:", style = Typography.labelSmall, color = TextSecondary)
                Spacer(modifier = Modifier.height(4.dp))

                OutlinedTextField(
                    value = inputUrl,
                    onValueChange = {
                        inputUrl = it
                        testStatus = null
                    },
                    modifier = Modifier.fillMaxWidth(),
                    shape = RoundedCornerShape(10.dp),
                    keyboardOptions = KeyboardOptions(
                        keyboardType = KeyboardType.Uri,
                        imeAction = ImeAction.Done
                    ),
                    keyboardActions = KeyboardActions(
                        onDone = { focusManager.clearFocus() }
                    ),
                    colors = OutlinedTextFieldDefaults.colors(
                        focusedTextColor = TextPrimary,
                        unfocusedTextColor = TextPrimary,
                        focusedBorderColor = AccentIndigo,
                        unfocusedBorderColor = BorderMedium,
                        focusedContainerColor = BgInput,
                        unfocusedContainerColor = BgInput
                    ),
                    singleLine = true,
                    textStyle = Typography.bodyMedium.copy(fontFamily = FontFamily.Monospace)
                )

                // Ping test indicator
                if (testStatus != null) {
                    Spacer(modifier = Modifier.height(10.dp))
                    Row(
                        verticalAlignment = Alignment.CenterVertically,
                        horizontalArrangement = Arrangement.spacedBy(6.dp),
                        modifier = Modifier
                            .fillMaxWidth()
                            .background(
                                if (isSuccess == true) SafeEmerald.copy(alpha = 0.12f) else CriticalRose.copy(alpha = 0.12f),
                                RoundedCornerShape(8.dp)
                            )
                            .padding(horizontal = 10.dp, vertical = 6.dp)
                    ) {
                        Icon(
                            if (isSuccess == true) Icons.Default.CheckCircle else Icons.Default.Error,
                            contentDescription = null,
                            tint = if (isSuccess == true) SafeEmerald else CriticalRose,
                            modifier = Modifier.size(16.dp)
                        )
                        Text(
                            text = testStatus!!,
                            color = if (isSuccess == true) SafeEmerald else CriticalRose,
                            fontSize = 12.sp,
                            fontWeight = FontWeight.SemiBold
                        )
                    }
                }

                Spacer(modifier = Modifier.height(20.dp))

                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.spacedBy(8.dp)
                ) {
                    OutlinedButton(
                        onClick = {
                            isTesting = true
                            testStatus = "Pinging..."
                            scope.launch {
                                val result = testServerPing(inputUrl)
                                isTesting = false
                                isSuccess = result.first
                                testStatus = result.second
                            }
                        },
                        enabled = !isTesting,
                        shape = RoundedCornerShape(10.dp),
                        colors = ButtonDefaults.outlinedButtonColors(contentColor = AccentCyan),
                        modifier = Modifier.weight(1f)
                    ) {
                        Icon(Icons.Default.Speed, contentDescription = null, modifier = Modifier.size(16.dp))
                        Spacer(modifier = Modifier.width(4.dp))
                        Text(if (isTesting) "Testing..." else "Test")
                    }

                    Button(
                        onClick = {
                            onSaveUrl(inputUrl)
                            onDismiss()
                        },
                        shape = RoundedCornerShape(10.dp),
                        colors = ButtonDefaults.buttonColors(containerColor = AccentIndigo),
                        modifier = Modifier.weight(1f)
                    ) {
                        Text("Save & Apply")
                    }
                }
            }
        }
    }
}

@Composable
private fun PresetChip(label: String, onClick: () -> Unit) {
    Box(
        modifier = Modifier
            .background(Color(0xFF1E293B), RoundedCornerShape(8.dp))
            .border(1.dp, BorderSubtle, RoundedCornerShape(8.dp))
            .clickable { onClick() }
            .padding(horizontal = 10.dp, vertical = 5.dp)
    ) {
        Text(text = label, color = TextSecondary, fontSize = 11.sp, fontWeight = FontWeight.Medium)
    }
}

private suspend fun testServerPing(urlStr: String): Pair<Boolean, String> = withContext(Dispatchers.IO) {
    try {
        val client = OkHttpClient.Builder()
            .connectTimeout(4, TimeUnit.SECONDS)
            .readTimeout(4, TimeUnit.SECONDS)
            .build()

        val cleanUrl = urlStr.trim().trimEnd('/')
        val pingUrl = if (cleanUrl.endsWith("/api")) "$cleanUrl/auth/me" else "$cleanUrl/api/auth/me"

        val startTime = System.currentTimeMillis()
        val request = Request.Builder().url(pingUrl).build()
        val response = client.newCall(request).execute()
        val latency = System.currentTimeMillis() - startTime

        if (response.code in 200..499) {
            Pair(true, "Connected! Server online (${latency}ms)")
        } else {
            Pair(false, "Server returned HTTP ${response.code}")
        }
    } catch (e: Exception) {
        Pair(false, "Cannot connect: ${e.localizedMessage ?: "Timeout"}")
    }
}
