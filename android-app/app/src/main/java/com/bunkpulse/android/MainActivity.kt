package com.bunkpulse.android

import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.activity.enableEdgeToEdge
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.navigation.compose.rememberNavController
import com.bunkpulse.android.core.designsystem.theme.AccentIndigo
import com.bunkpulse.android.core.designsystem.theme.BgMain
import com.bunkpulse.android.core.designsystem.theme.BunkPulseTheme
import com.bunkpulse.android.domain.repository.AuthRepository
import com.bunkpulse.android.ui.navigation.BunkPulseNavGraph
import com.bunkpulse.android.ui.navigation.Screen
import dagger.hilt.android.AndroidEntryPoint
import kotlinx.coroutines.flow.first
import javax.inject.Inject

@AndroidEntryPoint
class MainActivity : ComponentActivity() {

    @Inject
    lateinit var authRepository: AuthRepository

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        enableEdgeToEdge()

        setContent {
            BunkPulseTheme {
                val navController = rememberNavController()
                var startRoute by remember { mutableStateOf<String?>(null) }
                val sessionUser by authRepository.getSessionUser().collectAsState(initial = null)

                LaunchedEffect(Unit) {
                    val token = authRepository.getAuthToken()
                    val user = authRepository.getSessionUser().first()
                    startRoute = if (!token.isNullOrBlank() && user != null) {
                        Screen.Dashboard.route
                    } else {
                        Screen.Auth.route
                    }
                }

                // Automatically redirect to Auth screen if session expires (401 Unauthorized)
                LaunchedEffect(sessionUser, startRoute) {
                    if (startRoute != null && sessionUser == null) {
                        val currentRoute = navController.currentBackStackEntry?.destination?.route
                        if (currentRoute != null && currentRoute != Screen.Auth.route) {
                            navController.navigate(Screen.Auth.route) {
                                popUpTo(0) { inclusive = true }
                            }
                        }
                    }
                }

                if (startRoute == null) {
                    Box(
                        modifier = Modifier.fillMaxSize().background(BgMain),
                        contentAlignment = Alignment.Center
                    ) {
                        CircularProgressIndicator(color = AccentIndigo)
                    }
                } else {
                    BunkPulseNavGraph(
                        navController = navController,
                        startDestination = startRoute!!
                    )
                }
            }
        }
    }
}
