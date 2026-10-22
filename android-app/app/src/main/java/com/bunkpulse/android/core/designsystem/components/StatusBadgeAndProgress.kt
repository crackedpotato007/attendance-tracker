package com.bunkpulse.android.core.designsystem.components

import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.fillMaxHeight
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontFamily
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.Dp
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.bunkpulse.android.core.designsystem.theme.CriticalRose
import com.bunkpulse.android.core.designsystem.theme.SafeEmerald
import com.bunkpulse.android.core.designsystem.theme.WarningAmber

@Composable
fun StatusBadge(
    text: String,
    modifier: Modifier = Modifier,
    color: Color = SafeEmerald,
    textColor: Color = color,
    backgroundColor: Color = color.copy(alpha = 0.15f),
    borderColor: Color = color.copy(alpha = 0.35f)
) {
    Box(
        modifier = modifier
            .background(backgroundColor, RoundedCornerShape(8.dp))
            .border(1.dp, borderColor, RoundedCornerShape(8.dp))
            .padding(horizontal = 8.dp, vertical = 3.dp)
    ) {
        Text(
            text = text,
            color = textColor,
            fontSize = 12.sp,
            fontWeight = FontWeight.Bold,
            fontFamily = FontFamily.Monospace
        )
    }
}

@Composable
fun AttendanceProgressBar(
    percentage: Float,
    targetPercentage: Int = 75,
    modifier: Modifier = Modifier,
    height: Dp = 8.dp
) {
    val isSafe = percentage >= targetPercentage
    val barColor = if (isSafe) SafeEmerald else CriticalRose
    val clampedFraction = (percentage / 100f).coerceIn(0f, 1f)

    Box(
        modifier = modifier
            .fillMaxWidth()
            .height(height)
            .clip(CircleShape)
            .background(Color(0xFF1E293B))
    ) {
        Box(
            modifier = Modifier
                .fillMaxWidth(clampedFraction)
                .fillMaxHeight()
                .clip(CircleShape)
                .background(barColor)
        )
    }
}
