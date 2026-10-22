package com.bunkpulse.android.ui.dashboard

import androidx.compose.foundation.Canvas
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.geometry.Size
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.StrokeCap
import androidx.compose.ui.graphics.drawscope.Stroke
import androidx.compose.ui.text.font.FontFamily
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.bunkpulse.android.core.designsystem.theme.*
import com.bunkpulse.android.domain.calculator.AttendanceCalculator
import com.bunkpulse.android.domain.model.Subject

@Composable
fun OverallDoughnutChart(
    attended: Int,
    missed: Int,
    modifier: Modifier = Modifier
) {
    val total = attended + missed
    val attendedAngle = if (total > 0) (attended.toFloat() / total.toFloat()) * 360f else 0f
    val percentage = if (total > 0) ((attended.toFloat() / total.toFloat()) * 100).toInt() else 0

    Box(
        modifier = modifier.size(160.dp),
        contentAlignment = Alignment.Center
    ) {
        Canvas(modifier = Modifier.size(140.dp)) {
            val strokeWidth = 24.dp.toPx()
            val canvasSize = size.minDimension - strokeWidth
            val topLeft = Offset((size.width - canvasSize) / 2, (size.height - canvasSize) / 2)

            // Background Track
            drawArc(
                color = Color(0xFF1E293B),
                startAngle = 0f,
                sweepAngle = 360f,
                useCenter = false,
                topLeft = topLeft,
                size = Size(canvasSize, canvasSize),
                style = Stroke(width = strokeWidth)
            )

            // Missed Arc (Rose)
            drawArc(
                color = CriticalRose,
                startAngle = -90f,
                sweepAngle = 360f,
                useCenter = false,
                topLeft = topLeft,
                size = Size(canvasSize, canvasSize),
                style = Stroke(width = strokeWidth)
            )

            // Attended Arc (Emerald)
            if (attendedAngle > 0f) {
                drawArc(
                    color = SafeEmerald,
                    startAngle = -90f,
                    sweepAngle = attendedAngle,
                    useCenter = false,
                    topLeft = topLeft,
                    size = Size(canvasSize, canvasSize),
                    style = Stroke(width = strokeWidth, cap = StrokeCap.Round)
                )
            }
        }

        Column(horizontalAlignment = Alignment.CenterHorizontally) {
            Text(
                text = "$percentage%",
                fontSize = 26.sp,
                fontWeight = FontWeight.ExtraBold,
                fontFamily = FontFamily.Monospace,
                color = TextPrimary
            )
            Text(
                text = "$attended/$total Classes",
                fontSize = 11.sp,
                color = TextSecondary
            )
        }
    }
}

@Composable
fun SubjectComparisonBarChart(
    subjects: List<Subject>,
    targetGoal: Int = 75,
    modifier: Modifier = Modifier
) {
    if (subjects.isEmpty()) {
        Box(modifier = modifier.height(140.dp), contentAlignment = Alignment.Center) {
            Text("No courses to display", color = TextMuted, fontSize = 12.sp)
        }
        return
    }

    Row(
        modifier = modifier
            .fillMaxWidth()
            .height(160.dp)
            .padding(top = 10.dp, bottom = 4.dp),
        horizontalArrangement = Arrangement.SpaceEvenly,
        verticalAlignment = Alignment.Bottom
    ) {
        subjects.take(6).forEach { sub ->
            val stats = AttendanceCalculator.calculateSubjectStats(sub.attended, sub.total, targetGoal)
            val isSafe = stats.percentage >= targetGoal
            val barFraction = (stats.percentage / 100f).coerceIn(0.05f, 1f)

            Column(
                horizontalAlignment = Alignment.CenterHorizontally,
                verticalArrangement = Arrangement.Bottom,
                modifier = Modifier.fillMaxHeight()
            ) {
                Text(
                    text = "${stats.percentage.toInt()}%",
                    fontSize = 10.sp,
                    fontWeight = FontWeight.Bold,
                    fontFamily = FontFamily.Monospace,
                    color = if (isSafe) SafeEmerald else CriticalRose
                )
                Spacer(modifier = Modifier.height(4.dp))
                Box(
                    modifier = Modifier
                        .width(22.dp)
                        .fillMaxHeight(barFraction * 0.75f)
                        .clip(RoundedCornerShape(topStart = 6.dp, topEnd = 6.dp))
                        .background(if (isSafe) SafeEmerald else CriticalRose)
                )
                Spacer(modifier = Modifier.height(6.dp))
                Text(
                    text = sub.code.take(5),
                    fontSize = 10.sp,
                    fontFamily = FontFamily.Monospace,
                    fontWeight = FontWeight.Medium,
                    color = TextSecondary
                )
            }
        }
    }
}
