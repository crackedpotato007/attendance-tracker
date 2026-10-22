package com.bunkpulse.android.domain.model

data class User(
    val id: String,
    val email: String,
    val name: String,
    val targetAttendance: Int = 75
)
