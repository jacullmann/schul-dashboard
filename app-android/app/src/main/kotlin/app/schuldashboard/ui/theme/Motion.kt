package app.schuldashboard.ui.theme

import androidx.compose.animation.AnimatedVisibilityScope
import androidx.compose.animation.EnterExitState
import androidx.compose.animation.core.Animatable
import androidx.compose.animation.core.CubicBezierEasing
import androidx.compose.animation.core.SpringSpec
import androidx.compose.animation.core.animateFloat
import androidx.compose.animation.core.spring
import androidx.compose.animation.core.tween
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.saveable.rememberSaveable
import androidx.compose.runtime.setValue
import androidx.compose.ui.Modifier
import androidx.compose.ui.composed
import androidx.compose.ui.draw.blur
import androidx.compose.ui.draw.BlurredEdgeTreatment
import androidx.compose.ui.graphics.BlurEffect
import androidx.compose.ui.graphics.TileMode
import androidx.compose.ui.graphics.graphicsLayer
import androidx.compose.ui.platform.LocalDensity
import androidx.compose.ui.unit.Dp
import androidx.compose.ui.unit.dp
import kotlinx.coroutines.delay
import kotlinx.coroutines.launch
import kotlin.math.PI

/** The site's easing curves and durations (style.css and the components' transition classes). */
object Motion {
    val Ease = CubicBezierEasing(0.25f, 0.1f, 0.25f, 1f)
    val EaseOut = CubicBezierEasing(0f, 0f, 0.58f, 1f)
    val EaseInOut = CubicBezierEasing(0.4f, 0f, 0.2f, 1f)

    /** `--ease-settle`: leaves fast and settles slowly. */
    val Settle = CubicBezierEasing(0.16f, 1f, 0.3f, 1f)
    /** Entering blur and opacity. */
    val FocusIn = CubicBezierEasing(0.25f, 0.5f, 0.75f, 1f)
    /** Leaving blur. */
    val FocusOut = CubicBezierEasing(0.25f, 0f, 0.3f, 1f)
    /** Leaving motion: accelerates away. */
    val Exit = CubicBezierEasing(0.5f, 0f, 1f, 1f)
    /** The sheet and sidebar expand curve. */
    val Expand = CubicBezierEasing(0.22f, 1f, 0.36f, 1f)
    /** The sheet and sidebar collapse curve. */
    val Collapse = CubicBezierEasing(0.32f, 0f, 0.67f, 1f)
    /** iOS-like drawer curve used by form errors, menus and swaps. */
    val Drawer = CubicBezierEasing(0.32f, 0.72f, 0f, 1f)
    /** Checkbox fill and check stroke. */
    val Check = CubicBezierEasing(0.25f, 1f, 0.5f, 1f)
    /** Collapsing a checked card. */
    val Fold = CubicBezierEasing(0.78f, 0f, 0.22f, 1f)
    val Pulse = CubicBezierEasing(0.4f, 0f, 0.6f, 1f)
    /** Springy overshoot of swapped-in icons. */
    val Overshoot = CubicBezierEasing(0.34f, 1.4f, 0.64f, 1f)

    const val HOVER_MS = 100
    const val FOCUS_MS = 200

    /** How far apart the items of a page's entrance wave start. */
    const val STAGGER_MS = 60
    /** Past this many steps the rest arrive together, below the fold anyway. */
    const val MAX_STAGGER_STEPS = 8

    fun entranceDelay(order: Int): Int = order.coerceAtMost(MAX_STAGGER_STEPS) * STAGGER_MS

    /**
     * A spring described the way the site's BaseTabs does: `response` is one swing's length in
     * seconds, `dampingRatio` how much of it survives.
     */
    fun <T> spring(response: Float, dampingRatio: Float = 1f, visibilityThreshold: T? = null): SpringSpec<T> {
        val omega = 2 * PI.toFloat() / response
        return androidx.compose.animation.core.spring(dampingRatio, omega * omega, visibilityThreshold)
    }

    /**
     * `--ease-spring`: damping ratio 0.75, peaking at +2.8% after ~670ms and resting at ~1s,
     * the curve the site samples into `linear()`.
     */
    fun <T> settleSpring(visibilityThreshold: T? = null): SpringSpec<T> =
        androidx.compose.animation.core.spring(dampingRatio = 0.75f, stiffness = 50.7f, visibilityThreshold = visibilityThreshold)

    fun <T> hover() = tween<T>(HOVER_MS, easing = Motion.Ease)
    fun <T> focus() = tween<T>(FOCUS_MS, easing = Motion.Ease)
}

/**
 * The radius Android's blur needs to match a CSS `blur(px)`. CSS takes the Gaussian's standard
 * deviation, while Skia converts a radius r to σ = 0.57735·r + 0.5.
 */
fun cssBlur(px: Float): Dp = if (px <= 0.5f) 0.dp else ((px - 0.5f) / 0.57735f).dp

/**
 * The blur the site's swaps and form errors enter out of and leave into, [px] CSS pixels deep,
 * run on the enter and exit of the AnimatedVisibility or AnimatedContent child in [scope].
 * Focus clears on the site's focus curves; Android before 12 skips the blur and keeps the rest.
 */
@Composable
fun Modifier.focusBlur(scope: AnimatedVisibilityScope, px: Float, enterMs: Int, exitMs: Int, enterDelayMs: Int = 0): Modifier {
    val blur by scope.transition.animateFloat(
        {
            if (targetState == EnterExitState.Visible) tween(enterMs, enterDelayMs, Motion.FocusIn)
            else tween(exitMs, easing = Motion.FocusOut)
        },
        label = "focus",
    ) { if (it == EnterExitState.Visible) 0f else px }
    return graphicsLayer {
        val radius = cssBlur(blur).toPx()
        renderEffect = if (radius > 0f) BlurEffect(radius, radius, TileMode.Decal) else null
    }
}

/**
 * The site's `animate-enter`: blurred and transparent, it rises 16dp from 96% scale. Focus
 * clears over 600ms on the settle curve while a spring carries the motion, so the item is
 * sharp before it has quite arrived. [order] staggers it into the page's wave.
 */
fun Modifier.animateEnter(order: Int = 0, enabled: Boolean = true, delayMs: Int? = null): Modifier = if (!enabled) this else composed {
    // Saved, so a lazy list item scrolled out and back in does not enter a second time.
    var played by rememberSaveable { mutableStateOf(false) }
    val progress = remember { Animatable(if (played) 1f else 0f) }
    val rise = remember { Animatable(if (played) 1f else 0f) }
    val risePx = with(LocalDensity.current) { 16.dp.toPx() }
    LaunchedEffect(Unit) {
        if (played) return@LaunchedEffect
        delay((delayMs ?: Motion.entranceDelay(order)).toLong())
        launch { progress.animateTo(1f, tween(600, easing = Motion.Settle)) }
        rise.animateTo(1f, Motion.settleSpring())
        played = true
    }
    val blur = (1f - progress.value) * 8f
    this
        .graphicsLayer {
            alpha = progress.value
            val r = rise.value
            translationY = (1f - r) * risePx
            val scale = 0.96f + 0.04f * r
            scaleX = scale
            scaleY = scale
        }
        .then(if (blur > 0.05f) Modifier.blur(cssBlur(blur), BlurredEdgeTreatment.Unbounded) else Modifier)
}

/** The site's `animate-pulse`, for skeletons: fades to half and back every two seconds. */
fun pulseSpec() = androidx.compose.animation.core.infiniteRepeatable<Float>(
    tween(1000, easing = Motion.Pulse),
    androidx.compose.animation.core.RepeatMode.Reverse,
)
