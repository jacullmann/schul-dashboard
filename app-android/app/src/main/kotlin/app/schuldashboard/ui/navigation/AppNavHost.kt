package app.schuldashboard.ui.navigation

import androidx.compose.animation.core.tween
import androidx.compose.animation.fadeIn
import androidx.compose.animation.fadeOut
import androidx.compose.animation.slideInHorizontally
import androidx.compose.animation.slideOutHorizontally
import androidx.compose.runtime.Composable
import androidx.compose.ui.unit.IntOffset
import app.schuldashboard.ui.theme.Motion
import app.schuldashboard.BuildConfig
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.hilt.navigation.compose.hiltViewModel
import androidx.lifecycle.ViewModel
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import androidx.lifecycle.viewModelScope
import androidx.navigation.NavDestination.Companion.hasRoute
import androidx.navigation.compose.NavHost
import androidx.navigation.compose.composable
import androidx.navigation.navDeepLink
import androidx.navigation.compose.rememberNavController
import androidx.navigation.toRoute
import app.schuldashboard.data.AuthState
import app.schuldashboard.data.SessionRepository
import app.schuldashboard.ui.account.AccountScreen
import app.schuldashboard.ui.auth.ForgotPasswordScreen
import app.schuldashboard.ui.auth.LoginScreen
import app.schuldashboard.ui.auth.VerifyEmailScreen
import app.schuldashboard.ui.admin.SuperAdminScreen
import app.schuldashboard.ui.groups.InviteScreen
import app.schuldashboard.ui.groups.MyCoursesScreen
import app.schuldashboard.ui.groups.settings.GroupSettingsScreen
import app.schuldashboard.ui.auth.MfaScreen
import app.schuldashboard.ui.auth.RegisterScreen
import app.schuldashboard.ui.common.LoadingBox
import app.schuldashboard.ui.groups.GroupHost
import app.schuldashboard.ui.groups.GroupsScreen
import app.schuldashboard.ui.tasks.TaskFormScreen
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.launch
import javax.inject.Inject

@HiltViewModel
class AppViewModel @Inject constructor(private val sessions: SessionRepository) : ViewModel() {
    val state = sessions.state

    init {
        viewModelScope.launch { sessions.init() }
    }
}

@Composable
fun AppNavHost(viewModel: AppViewModel = hiltViewModel()) {
    val state by viewModel.state.collectAsStateWithLifecycle()
    if (state is AuthState.Loading) {
        LoadingBox()
        return
    }

    val navController = rememberNavController()
    val loggedIn = state as? AuthState.LoggedIn
    val home: Any = loggedIn?.let { auth ->
        val landing = auth.landingGroupId?.takeIf { id -> auth.groups.any { it.id == id } }
            ?: auth.groups.firstOrNull()?.id
        landing?.let(::GroupRoute) ?: GroupsRoute
    } ?: LoginRoute

    // Signing in or out replaces the whole back stack, so back never returns to the other side.
    LaunchedEffect(loggedIn != null) {
        val current = navController.currentDestination
        val onAuthScreen = current?.hasRoute(LoginRoute::class) == true ||
            current?.hasRoute(RegisterRoute::class) == true ||
            current?.hasRoute(MfaRoute::class) == true
        if (loggedIn == null && !onAuthScreen || loggedIn != null && onAuthScreen) {
            navController.navigate(home) { popUpTo(0) { inclusive = true } }
        }
    }

    // Pages slide in over the one they cover, like the site's settings panes; the page behind
    // eases back 15% and dims.
    val spec = tween<IntOffset>(450, easing = Motion.Settle)
    val fade = tween<Float>(450, easing = Motion.Ease)
    NavHost(
        navController,
        startDestination = home,
        enterTransition = { slideInHorizontally(spec) { it } },
        exitTransition = { slideOutHorizontally(spec) { -it * 15 / 100 } + fadeOut(fade, targetAlpha = 0.6f) },
        popEnterTransition = { slideInHorizontally(spec) { -it * 15 / 100 } + fadeIn(fade, initialAlpha = 0.6f) },
        popExitTransition = { slideOutHorizontally(spec) { it } },
    ) {
        composable<LoginRoute> {
            LoginScreen(
                onRegister = { navController.navigate(RegisterRoute) },
                onForgotPassword = { navController.navigate(ForgotPasswordRoute) },
                onMfaRequired = { navController.navigate(MfaRoute) },
            )
        }
        composable<ForgotPasswordRoute> { ForgotPasswordScreen(onBack = navController::popBackStack) }
        composable<VerifyEmailRoute>(
            deepLinks = listOf(navDeepLink<VerifyEmailRoute>(basePath = "${BuildConfig.SITE_URL}/verify")),
        ) {
            VerifyEmailScreen(onDone = { navController.navigate(home) { popUpTo(0) { inclusive = true } } })
        }
        composable<InviteRoute>(
            deepLinks = listOf(navDeepLink<InviteRoute>(basePath = "${BuildConfig.SITE_URL}/invite")),
        ) { entry ->
            InviteScreen(
                onOpenGroup = { navController.navigate(GroupRoute(it)) { popUpTo(0) { inclusive = true } } },
                onCancel = { navController.navigate(home) { popUpTo(0) { inclusive = true } } },
            )
        }
        composable<RegisterRoute> { RegisterScreen(onBack = navController::popBackStack) }
        composable<MfaRoute> { MfaScreen(onBack = navController::popBackStack) }
        composable<GroupsRoute> {
            GroupsScreen(
                onOpenGroup = { navController.navigate(GroupRoute(it)) { popUpTo<GroupsRoute> { inclusive = true } } },
                onAccount = { navController.navigate(AccountRoute) },
                onAdmin = { navController.navigate(SuperAdminRoute) },
            )
        }
        composable<SuperAdminRoute> { SuperAdminScreen(onBack = navController::popBackStack) }
        composable<GroupRoute> { entry ->
            val route = entry.toRoute<GroupRoute>()
            GroupHost(
                groupId = route.groupId,
                onSwitchGroup = { navController.navigate(GroupsRoute) },
                onAccount = { navController.navigate(AccountRoute) },
                onSettings = { navController.navigate(GroupSettingsRoute(route.groupId)) },
                onMyCourses = { navController.navigate(MyCoursesRoute(route.groupId)) },
                onCreateTask = { navController.navigate(TaskFormRoute(route.groupId)) },
                onEditTask = { navController.navigate(TaskFormRoute(route.groupId, it)) },
            )
        }
        composable<MyCoursesRoute> { MyCoursesScreen(onDone = navController::popBackStack) }
        composable<GroupSettingsRoute> {
            GroupSettingsScreen(
                onBack = navController::popBackStack,
                onGroupGone = { navController.navigate(GroupsRoute) { popUpTo(0) { inclusive = true } } },
            )
        }
        composable<TaskFormRoute> {
            TaskFormScreen(onDone = navController::popBackStack)
        }
        composable<AccountRoute> { AccountScreen(onBack = navController::popBackStack) }
    }
}
