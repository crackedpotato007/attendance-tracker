package com.bunkpulse.android.data.remote.dto

import kotlinx.serialization.Serializable

@Serializable
data class UserDto(
    val id: String,
    val email: String,
    val name: String,
    val targetAttendance: Int = 75
)

@Serializable
data class LoginRequestDto(
    val email: String,
    val password: String
)

@Serializable
data class SignupRequestDto(
    val name: String,
    val email: String,
    val password: String,
    val targetAttendance: Int = 75
)

@Serializable
data class UpdateProfileRequestDto(
    val name: String? = null,
    val targetAttendance: Int? = null
)

@Serializable
data class AuthResponseDto(
    val message: String? = null,
    val user: UserDto? = null,
    val token: String? = null
)

@Serializable
data class SessionResponseDto(
    val user: UserDto? = null
)

@Serializable
data class MessageResponseDto(
    val message: String
)

@Serializable
data class ErrorResponseDto(
    val error: String
)
