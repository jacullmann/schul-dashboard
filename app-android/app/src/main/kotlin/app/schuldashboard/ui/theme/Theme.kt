package app.schuldashboard.ui.theme

import androidx.compose.foundation.LocalIndication
import androidx.compose.foundation.isSystemInDarkTheme
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.text.selection.LocalTextSelectionColors
import androidx.compose.foundation.text.selection.TextSelectionColors
import androidx.compose.material3.ColorScheme
import androidx.compose.material3.LocalContentColor
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Shapes
import androidx.compose.material3.Surface
import androidx.compose.material3.Typography
import androidx.compose.material3.darkColorScheme
import androidx.compose.material3.lightColorScheme
import androidx.compose.material3.ripple
import androidx.compose.runtime.Composable
import androidx.compose.runtime.CompositionLocalProvider
import androidx.compose.runtime.Immutable
import androidx.compose.runtime.ReadOnlyComposable
import androidx.compose.runtime.staticCompositionLocalOf
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.compositeOver
import androidx.compose.ui.text.ExperimentalTextApi
import androidx.compose.ui.text.TextStyle
import androidx.compose.ui.text.font.Font
import androidx.compose.ui.text.font.FontFamily
import androidx.compose.ui.text.font.FontVariation
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.LineHeightStyle
import androidx.compose.ui.unit.TextUnit
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.em
import androidx.compose.ui.unit.sp
import app.schuldashboard.R
import app.schuldashboard.data.ThemeMode

/** The web app's palette (style.css `@theme`), converted from OKLCH. */
private object Palette {
    val Black = Color(0xFF000000)
    val White = Color(0xFFFFFFFF)
    val Vapor = Color.Black.copy(alpha = 0.07f)
    val Smoke = Color.Black.copy(alpha = 0.13f)
    val Mist = Color.White.copy(alpha = 0.11f)
    val Onyx = Color(0xFF0F0F0F)
    val Charcoal = Color(0xFF282828)
    val CharcoalHighlight = Color(0xFF323232)
    val Graphite = Color(0xFF414141)
    val Steel = Color(0xFF666666)
    val Ghost = Color(0xFF888888)
    val Ash = Color(0xFFCCCCCC)
    val Cloud = Color(0xFFDDDDDD)
    val WhiteHighlight = Color(0xFFEEEEEE)
    val SurfaceHighlight = Color(0xFFF5F5F5)
    val SurfaceHoverBorder = Color(0xFFBBBBBB)
    val Cinnabar = Color(0xFFEF4444)
    val Coral = Color(0xFFF65252)
    val CoralHighlight = Color(0xFFFF6666)
    val CottonCandy = Color(0xFFF8D4D3)
    val Yellow = Color(0xFFEAB308)
    val Basil = Color(0xFF26B63D)
    val Pistachio = Color(0xFF6FE276)
    val Blue600 = Color(0xFF155DFC)
    val Blue500 = Color(0xFF2B7FFF)
}

/** The site's semantic colour tokens; names match the CSS custom properties without `--color-`. */
@Immutable
data class AppColors(
    val isDark: Boolean,
    val canvas: Color,
    val surface: Color,
    val surfaceHover: Color,
    val surfaceHighlight: Color,
    val surfaceHoverBorder: Color,
    val ghostBorder: Color,
    val ghostHover: Color,
    val onGhost: Color,
    val onGhostMuted: Color,
    val onGhostSubtle: Color,
    val action: Color,
    val actionHover: Color,
    val onAction: Color,
    val onActionMuted: Color,
    val accent: Color,
    val danger: Color,
    val onDanger: Color,
    val onDangerMuted: Color,
    val dangerHighlight: Color,
    val dangerHover: Color,
    val success: Color,
    val onSuccess: Color,
    val successHover: Color,
    val warn: Color,
    val onWarn: Color,
    val focus: Color,
    val focusRing: Color,
    val shadowHeavy: Color,
    val steel: Color,
    val graphite: Color,
)

private fun mix(color: Color, amount: Float) = color.copy(alpha = amount)

private val LightColors = AppColors(
    isDark = false,
    canvas = Palette.White,
    surface = Palette.White,
    surfaceHover = Palette.Vapor,
    surfaceHighlight = Palette.SurfaceHighlight,
    surfaceHoverBorder = Palette.SurfaceHoverBorder,
    ghostBorder = Palette.Smoke,
    ghostHover = Palette.Vapor,
    onGhost = Palette.Black,
    onGhostMuted = Palette.Graphite,
    onGhostSubtle = Palette.Ghost,
    action = Palette.Black,
    actionHover = Palette.Charcoal,
    onAction = Palette.White,
    onActionMuted = Palette.Ash,
    accent = Palette.Blue600,
    danger = Palette.Cinnabar,
    onDanger = Palette.White,
    onDangerMuted = Palette.CottonCandy,
    dangerHighlight = Palette.CoralHighlight,
    dangerHover = mix(Palette.Cinnabar, 0.12f),
    success = Palette.Basil,
    onSuccess = Palette.White,
    successHover = mix(Palette.Basil, 0.15f),
    warn = Palette.Yellow,
    onWarn = Palette.Onyx,
    focus = Palette.Ghost,
    focusRing = Palette.Cloud,
    shadowHeavy = Color.Black.copy(alpha = 0.10f),
    steel = Palette.Steel,
    graphite = Palette.Graphite,
)

private val DarkColors = AppColors(
    isDark = true,
    canvas = Palette.Onyx,
    surface = Palette.Charcoal,
    surfaceHover = Palette.Mist,
    surfaceHighlight = Palette.CharcoalHighlight,
    surfaceHoverBorder = Palette.Steel,
    ghostBorder = Palette.Mist,
    ghostHover = Palette.Mist,
    onGhost = Palette.White,
    onGhostMuted = Palette.Ash,
    onGhostSubtle = Palette.Ghost,
    action = Palette.White,
    actionHover = Palette.WhiteHighlight,
    onAction = Palette.Onyx,
    onActionMuted = Palette.Graphite,
    accent = Palette.Blue500,
    danger = Palette.Coral,
    onDanger = Palette.White,
    onDangerMuted = Palette.CottonCandy,
    dangerHighlight = Palette.CoralHighlight,
    dangerHover = mix(Palette.Coral, 0.15f),
    success = Palette.Pistachio,
    onSuccess = Palette.White,
    successHover = mix(Palette.Pistachio, 0.15f),
    warn = Palette.Yellow,
    onWarn = Palette.Onyx,
    focus = Palette.Ash,
    focusRing = Palette.Graphite,
    shadowHeavy = Color.Black.copy(alpha = 0.40f),
    steel = Palette.Steel,
    graphite = Palette.Graphite,
)

val LocalAppColors = staticCompositionLocalOf { LightColors }

/** Resolves a translucent token against the surface it sits on, for places that need an opaque colour. */
fun Color.over(background: Color): Color = compositeOver(background)

@OptIn(ExperimentalTextApi::class)
private fun interWeight(weight: FontWeight) = Font(
    R.font.inter_variable,
    weight,
    variationSettings = FontVariation.Settings(FontVariation.weight(weight.weight)),
)

/** Inter as a variable font: one file serves every weight the site uses. */
val InterFamily = FontFamily(
    interWeight(FontWeight.Normal),
    interWeight(FontWeight.Medium),
    interWeight(FontWeight.SemiBold),
    interWeight(FontWeight.Bold),
)

/** Satoshi, the site's heading face, in the three weights it loads from Fontshare. */
val DisplayFamily = FontFamily(
    Font(R.font.satoshi_regular, FontWeight.Normal),
    Font(R.font.satoshi_medium, FontWeight.Medium),
    Font(R.font.satoshi_bold, FontWeight.Bold),
)

private val Trim = LineHeightStyle(LineHeightStyle.Alignment.Center, LineHeightStyle.Trim.None)

private fun text(size: Int, lineHeight: TextUnit, weight: FontWeight = FontWeight.Normal) = TextStyle(
    fontFamily = InterFamily,
    fontWeight = weight,
    fontSize = size.sp,
    lineHeight = lineHeight,
    lineHeightStyle = Trim,
)

private fun heading(size: Int, tracking: Double) = TextStyle(
    fontFamily = DisplayFamily,
    fontWeight = FontWeight.Bold,
    fontSize = size.sp,
    lineHeight = (size * 1.5).sp,
    letterSpacing = tracking.em,
    lineHeightStyle = Trim,
)

/** Tailwind's text scale and the site's heading styles (style.css `h1`–`h5`). */
object AppText {
    val xs2 = text(10, 12.sp)
    val xs = text(12, 16.sp)
    val sm = text(14, 20.sp)
    val base = text(16, 24.sp)
    val lg = text(18, 28.sp)
    val xl = text(20, 28.sp)
    val xl2 = text(24, 32.sp)
    val h1 = heading(32, -0.03)
    val h2 = heading(24, -0.02)
    val h3 = heading(20, -0.01)
    val h4 = heading(18, 0.0)
    val h5 = heading(16, 0.02)
}

/** The site's radius scale (style.css `--radius-*`), which is larger than Tailwind's defaults. */
object Radius {
    val sm = 4.dp
    val md = 8.dp
    val lg = 12.dp
    val xl = 16.dp
    val xl2 = 24.dp
    val xl3 = 32.dp
}

private fun materialScheme(c: AppColors): ColorScheme {
    val base = if (c.isDark) darkColorScheme() else lightColorScheme()
    return base.copy(
        primary = c.action,
        onPrimary = c.onAction,
        secondary = c.onGhostMuted,
        onSecondary = c.canvas,
        tertiary = c.accent,
        onTertiary = Color.White,
        background = c.canvas,
        onBackground = c.onGhost,
        surface = c.canvas,
        onSurface = c.onGhost,
        surfaceVariant = c.surfaceHighlight,
        onSurfaceVariant = c.onGhostMuted,
        surfaceContainerLowest = c.canvas,
        surfaceContainerLow = c.surface,
        surfaceContainer = c.surface,
        surfaceContainerHigh = c.surface,
        surfaceContainerHighest = c.surfaceHighlight,
        outline = c.ghostBorder,
        outlineVariant = c.ghostBorder,
        error = c.danger,
        onError = c.onDanger,
        scrim = Color.Black,
    )
}

private val MaterialTypography = Typography(
    headlineMedium = AppText.h2,
    headlineSmall = AppText.h2,
    titleLarge = AppText.h3,
    titleMedium = AppText.h4,
    titleSmall = AppText.base.copy(fontWeight = FontWeight.SemiBold),
    bodyLarge = AppText.base,
    bodyMedium = AppText.sm,
    bodySmall = AppText.xs,
    labelLarge = AppText.sm.copy(fontWeight = FontWeight.Medium),
    labelMedium = AppText.xs.copy(fontWeight = FontWeight.Medium),
    labelSmall = AppText.xs2.copy(fontWeight = FontWeight.Medium),
)

private val MaterialShapes = Shapes(
    extraSmall = RoundedCornerShape(Radius.md),
    small = RoundedCornerShape(Radius.lg),
    medium = RoundedCornerShape(Radius.xl),
    large = RoundedCornerShape(Radius.xl),
    extraLarge = RoundedCornerShape(Radius.xl2),
)

@Composable
fun ThemeMode.isDark(): Boolean = when (this) {
    ThemeMode.System -> isSystemInDarkTheme()
    ThemeMode.Light -> false
    ThemeMode.Dark -> true
}

@Composable
fun SchulTheme(mode: ThemeMode = ThemeMode.System, content: @Composable () -> Unit) {
    val colors = if (mode.isDark()) DarkColors else LightColors
    CompositionLocalProvider(LocalAppColors provides colors) {
        MaterialTheme(colorScheme = materialScheme(colors), typography = MaterialTypography, shapes = MaterialShapes) {
            // Selections invert like the site's `::selection`.
            val selection = TextSelectionColors(handleColor = colors.action, backgroundColor = colors.action.copy(alpha = 0.3f))
            CompositionLocalProvider(
                LocalTextSelectionColors provides selection,
                LocalIndication provides ripple(),
            ) {
                // Supplies the default text colour every bare Text inherits.
                Surface(color = colors.canvas, contentColor = colors.onGhost) {
                    CompositionLocalProvider(LocalContentColor provides colors.onGhost, content = content)
                }
            }
        }
    }
}

object AppTheme {
    val colors: AppColors
        @Composable @ReadOnlyComposable get() = LocalAppColors.current
}
