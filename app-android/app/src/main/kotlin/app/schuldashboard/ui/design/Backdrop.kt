package app.schuldashboard.ui.design

import android.graphics.ColorMatrix
import android.graphics.ColorMatrixColorFilter
import android.graphics.RuntimeShader
import android.graphics.Shader
import android.os.Build
import androidx.annotation.RequiresApi
import androidx.compose.animation.core.Easing
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.runtime.staticCompositionLocalOf
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.drawBehind
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.geometry.Size
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.asComposeRenderEffect
import androidx.compose.ui.graphics.drawscope.translate
import androidx.compose.ui.graphics.layer.drawLayer
import androidx.compose.ui.graphics.rememberGraphicsLayer
import androidx.compose.ui.layout.onGloballyPositioned
import androidx.compose.ui.layout.positionOnScreen
import androidx.compose.ui.unit.dp
import app.schuldashboard.ui.theme.cssBlur
import dev.chrisbanes.haze.HazeProgressive
import dev.chrisbanes.haze.HazeState
import dev.chrisbanes.haze.HazeTint
import dev.chrisbanes.haze.hazeEffect
import kotlin.math.pow

/**
 * Whether this device blurs what lies behind a surface. RenderEffect arrived with Android 12;
 * older versions keep the site's tints and dims on their own, the way the site looks in a
 * browser without `backdrop-filter`.
 */
val BackdropBlurSupported = Build.VERSION.SDK_INT >= Build.VERSION_CODES.S

/**
 * The whole window's content, which overlays blur behind their backdrops (BaseBackdrop). Each
 * overlay registers itself one level higher, so a sheet opened over a modal blurs both.
 */
val LocalPageBackdrop = staticCompositionLocalOf { HazeState() }

/**
 * A backdrop blurring everything below this overlay by the CSS [blurPx], under [dim]. [strength]
 * scales both, the way the image viewer lets go of the page while its image is dragged away.
 * On devices without blur only the dim is drawn.
 */
@Composable
internal fun OverlayBackdrop(blurPx: Float, dim: Color, modifier: Modifier = Modifier, strength: () -> Float = { 1f }) {
    Box(
        modifier
            .fillMaxSize()
            .hazeEffect(LocalPageBackdrop.current) {
                val scale = strength()
                val tint = HazeTint(dim.copy(alpha = dim.alpha * scale))
                blurRadius = cssBlur(blurPx * scale)
                noiseFactor = 0f
                tints = listOf(tint)
                fallbackTint = tint
            },
    )
}

/**
 * A small surface frosted over the content of [state] beneath it, like the site's
 * `backdrop-blur-*` chips over images, tinted with [tint]. Without blur only the tint remains.
 */
fun Modifier.frosted(state: HazeState, blurPx: Float, tint: Color): Modifier = hazeEffect(state) {
    blurRadius = cssBlur(blurPx)
    noiseFactor = 0f
    tints = listOf(HazeTint(tint))
    fallbackTint = HazeTint(tint)
}

private const val SCROLL_FADE_MAX_BLUR = 12f
private const val SCROLL_FADE_MIN_BLUR = 0.5f

/**
 * BaseScrollFade: content scrolling under a sticky header blurs more the closer it gets to the
 * top edge and fades into [color]. The site stacks eight masked backdrop filters to fake a
 * variable blur; Haze draws a real one.
 */
fun Modifier.scrollFade(state: HazeState, color: Color): Modifier = this
    .hazeEffect(state) {
        // Haze's progressive shader treats the radius as 2σ.
        blurRadius = (SCROLL_FADE_MAX_BLUR * 2).dp
        noiseFactor = 0f
        backgroundColor = color
        tints = emptyList()
        fallbackTint = HazeTint.Unspecified
        progressive = HazeProgressive.verticalGradient(
            easing = ScrollFadeEasing,
            startIntensity = 1f,
            endIntensity = 0f,
        )
    }
    .drawBehind {
        // Without the blur, content would stay sharp behind the header, so the tint only fades
        // over the last 16dp.
        val fade = if (BackdropBlurSupported) 1f else (16.dp.toPx() / size.height).coerceAtMost(1f)
        fun stop(at: Float) = 1f - fade + at * fade
        drawRect(
            Brush.verticalGradient(
                0f to color, stop(0.3f) to color.copy(alpha = 0.8f), stop(0.55f) to color.copy(alpha = 0.5f),
                stop(0.8f) to color.copy(alpha = 0.2f), 1f to Color.Transparent,
            ),
        )
    }

/** The site's layers grow their blur geometrically from the bottom edge up to the top. */
private val ScrollFadeEasing = Easing { fraction ->
    1f - (SCROLL_FADE_MAX_BLUR / SCROLL_FADE_MIN_BLUR).pow(-fraction)
}

/**
 * The tab bar's glass (BaseTabs with BaseGlassRefraction): the page behind bends along the
 * capsule's rim like the edge of a lens, blurs by 2px and gains 50% saturation. The site only
 * gets the lens in Chromium, from a displacement map painted on a canvas; Android 13 computes it
 * per pixel in a shader. Android 12 keeps the frosted glass without the lens.
 */
@Composable
fun GlassBackdrop(state: HazeState, modifier: Modifier = Modifier) {
    when {
        Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU -> LensGlass(state, modifier)
        BackdropBlurSupported -> Box(
            modifier.fillMaxSize().hazeEffect(state) {
                blurRadius = cssBlur(GLASS_BLUR_PX)
                noiseFactor = 0f
                tints = emptyList()
            },
        )
    }
}

private const val GLASS_BLUR_PX = 2f
private const val GLASS_SATURATION = 1.5f

/** How far in from the rim the glass curves, and how far it bends the backdrop at most, as shares of the height. */
private const val BEZEL_RATIO = 0.3f
private const val DISPLACEMENT_RATIO = 0.3f

@RequiresApi(Build.VERSION_CODES.TIRAMISU)
@Composable
private fun LensGlass(state: HazeState, modifier: Modifier) {
    val layer = rememberGraphicsLayer()
    var origin by remember { mutableStateOf(Offset.Unspecified) }
    val effect = remember { LensEffect() }
    Box(
        modifier
            .fillMaxSize()
            .onGloballyPositioned { origin = it.positionOnScreen() }
            .drawBehind {
                if (origin == Offset.Unspecified) return@drawBehind
                layer.renderEffect = effect.forSize(size, cssBlur(GLASS_BLUR_PX).toPx()).asComposeRenderEffect()
                layer.record {
                    for (area in state.areas) {
                        val content = area.contentLayer ?: continue
                        translate(area.positionOnScreen.x - origin.x, area.positionOnScreen.y - origin.y) {
                            drawLayer(content)
                        }
                    }
                }
                drawLayer(layer)
            },
    )
}

/** Builds the lens → blur → saturation chain once per capsule size. */
@RequiresApi(Build.VERSION_CODES.TIRAMISU)
private class LensEffect {
    private val shader = RuntimeShader(LENS_SHADER)
    private var size = Size.Zero
    private var effect: android.graphics.RenderEffect? = null

    fun forSize(size: Size, blurRadiusPx: Float): android.graphics.RenderEffect {
        effect?.takeIf { size == this.size }?.let { return it }
        this.size = size
        shader.setFloatUniform("size", size.width, size.height)
        shader.setFloatUniform("bezel", size.height * BEZEL_RATIO)
        shader.setFloatUniform("displacement", size.height * DISPLACEMENT_RATIO)
        val lens = android.graphics.RenderEffect.createRuntimeShaderEffect(shader, "content")
        val blur = android.graphics.RenderEffect.createBlurEffect(blurRadiusPx, blurRadiusPx, lens, Shader.TileMode.CLAMP)
        val saturate = ColorMatrixColorFilter(ColorMatrix().apply { setSaturation(GLASS_SATURATION) })
        return android.graphics.RenderEffect.createColorFilterEffect(saturate, blur).also { effect = it }
    }
}

/**
 * useRefractionMap's displacement map as a shader: along the bezel every pixel shows the
 * backdrop from further in towards the centre, bending ever more steeply towards the rim on a
 * quarter-circle profile.
 */
private const val LENS_SHADER = """
uniform shader content;
uniform float2 size;
uniform float bezel;
uniform float displacement;

half4 main(float2 coord) {
    float2 fromCenter = coord - size * 0.5;
    float radius = min(size.x, size.y) * 0.5;
    float2 over = abs(fromCenter) - (size * 0.5 - radius);
    float2 normal;
    float fromCore;
    if (over.x > 0.0 && over.y > 0.0) {
        fromCore = length(over);
        normal = over / fromCore;
    } else if (over.x > over.y) {
        fromCore = over.x;
        normal = float2(1.0, 0.0);
    } else {
        fromCore = over.y;
        normal = float2(0.0, 1.0);
    }
    normal *= sign(fromCenter);
    float depth = clamp(1.0 - (radius - fromCore) / bezel, 0.0, 1.0);
    float pull = 1.0 - sqrt(1.0 - depth * depth);
    return content.eval(coord - normal * pull * displacement);
}
"""
