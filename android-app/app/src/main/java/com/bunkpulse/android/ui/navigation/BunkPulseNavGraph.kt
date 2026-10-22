package com.bunkpulse.android.ui.navigation

import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.imePadding
import androidx.compose.foundation.layout.padding
import androidx.compose.material3.Scaffold
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.ui.Modifier
import androidx.hilt.navigation.compose.hiltViewModel
import androidx.navigation.NavHostController
import androidx.navigation.compose.NavHost
import androidx.navigation.compose.composable
import androidx.navigation.compose.currentBackStackEntryAsState
import com.bunkpulse.android.core.designsystem.theme.BgMain
import com.bunkpulse.android.ui.auth.AuthScreen
import com.bunkpulse.android.ui.auth.AuthViewModel
import com.bunkpulse.android.ui.dashboard.DashboardScreen
import com.bunkpulse.android.ui.dashboard.HomeViewModel
import com.bunkpulse.android.ui.logger.LoggerViewModel
import com.bunkpulse.android.ui.logger.ManageLoggerScreen
import com.bunkpulse.android.ui.schedule.ScheduleScreen
import com.bunkpulse.android.ui.schedule.ScheduleViewModel
import com.bunkpulse.android.ui.simulator.BunkCalculatorScreen
import com.bunkpulse.android.ui.simulator.SimulatorViewModel
import com.bunkpulse.android.ui.subjects.SubjectsManagerScreen
import com.bunkpulse.android.ui.subjects.SubjectsViewModel

@Composable
fun BunkPulseNavGraph(
    navController: NavHostController,
    startDestination: String = Screen.Auth.route
) {
    val navBackStackEntry by navController.currentBackStackEntryAsState()
    val currentRoute = navBackStackEntry?.destination?.route
    val showBottomBar = currentRoute != null && currentRoute != Screen.Auth.route

    Scaffold(
        containerColor = BgMain,
        bottomBar = {
            if (showBottomBar) {
                BottomNavBar(
                    currentRoute = currentRoute,
                    onNavigate = { route ->
                        navController.navigate(route) {
                            popUpTo(Screen.Dashboard.route) { saveState = true }
                            launchSingleTop = true
                            restoreState = true
                        }
                    }
                )
            }
        }
    ) { paddingValues ->
        NavHost(
            navController = navController,
            startDestination = startDestination,
            modifier = Modifier
                .fillMaxSize()
                .padding(paddingValues)
                .imePadding()
        ) {
            composable(Screen.Auth.route) {
                val authViewModel: AuthViewModel = hiltViewModel()
                AuthScreen(
                    viewModel = authViewModel,
                    onAuthSuccess = {
                        navController.navigate(Screen.Dashboard.route) {
                            popUpTo(Screen.Auth.route) { inclusive = true }
                        }
                    }
                )
            }

            composable(Screen.Dashboard.route) {
                val homeViewModel: HomeViewModel = hiltViewModel()
                DashboardScreen(
                    viewModel = homeViewModel,
                    onNavigateToLogger = { navController.navigate(Screen.Logger.route) },
                    onNavigateToSimulator = { navController.navigate(Screen.Simulator.route) },
                    onNavigateToCalendar = { navController.navigate(Screen.Schedule.route) }
                )
            }

            composable(Screen.Logger.route) {
                val loggerViewModel: LoggerViewModel = hiltViewModel()
                ManageLoggerScreen(viewModel = loggerViewModel)
            }

            composable(Screen.Simulator.route) {
                val simulatorViewModel: SimulatorViewModel = hiltViewModel()
                BunkCalculatorScreen(viewModel = simulatorViewModel)
            }

            composable(Screen.Schedule.route) {
                val scheduleViewModel: ScheduleViewModel = hiltViewModel()
                ScheduleScreen(viewModel = scheduleViewModel)
            }

            composable(Screen.Subjects.route) {
                val subjectsViewModel: SubjectsViewModel = hiltViewModel()
                SubjectsManagerScreen(
                    viewModel = subjectsViewModel,
                    onLoggedOut = {
                        navController.navigate(Screen.Auth.route) {
                            popUpTo(0) { inclusive = true }
                        }
                    }
                )
            }
        }
    }
}
