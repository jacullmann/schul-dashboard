package app.schuldashboard.ui.navigation

import kotlinx.serialization.Serializable

@Serializable data object LoginRoute

@Serializable data object RegisterRoute

@Serializable data object MfaRoute

@Serializable data object GroupsRoute

@Serializable data object AccountRoute

@Serializable data class GroupRoute(val groupId: String)

@Serializable data class TaskFormRoute(val groupId: String, val itemId: String? = null)

@Serializable data object ForgotPasswordRoute

@Serializable data class VerifyEmailRoute(val token: String = "")

@Serializable data class InviteRoute(val token: String)

@Serializable data class GroupSettingsRoute(val groupId: String)

@Serializable data object SuperAdminRoute

@Serializable data class MyCoursesRoute(val groupId: String)
