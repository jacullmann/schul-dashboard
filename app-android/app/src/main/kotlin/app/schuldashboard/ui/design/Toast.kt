package app.schuldashboard.ui.design

import androidx.compose.animation.core.Animatable
import androidx.compose.animation.core.animateFloatAsState
import androidx.compose.animation.core.tween
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.BoxScope
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.statusBarsPadding
import androidx.compose.foundation.layout.widthIn
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.material3.LocalContentColor
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.CompositionLocalProvider
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.key
import androidx.compose.runtime.mutableStateListOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.staticCompositionLocalOf
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.draw.shadow
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.graphicsLayer
import androidx.compose.ui.platform.LocalDensity
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.compose.ui.zIndex
import app.schuldashboard.R
import app.schuldashboard.ui.icons.Icon
import app.schuldashboard.ui.icons.Lucide
import app.schuldashboard.ui.theme.AppText
import app.schuldashboard.ui.theme.AppTheme
import app.schuldashboard.ui.theme.Motion
import kotlinx.coroutines.delay

enum class ToastType { Success, Error, Warning, Info }

class Toast internal constructor(val id: Long, val message: String, val type: ToastType) {
    internal val leaving = androidx.compose.runtime.mutableStateOf(false)
}

/** BaseToast's queue. The front toast's timer runs; the ones stacked behind it wait. */
class Toaster {
    internal val toasts = mutableStateListOf<Toast>()
    private var nextId = 0L

    fun show(message: String, type: ToastType = ToastType.Info) {
        toasts += Toast(nextId++, message, type)
    }

    fun success(message: String) = show(message, ToastType.Success)
    fun error(message: String) = show(message, ToastType.Error)

    internal fun dismiss(toast: Toast) {
        toast.leaving.value = true
    }

    internal fun remove(toast: Toast) {
        toasts.remove(toast)
    }
}

val LocalToaster = staticCompositionLocalOf { Toaster() }

private const val VISIBLE_COUNT = 3
private val StackGap = 12.dp

/**
 * The toast stack at the top of the screen: pills in the action, danger, warn or surface colour.
 * Each new toast drops in from above; those behind it step down 12dp, shrink by 5% and grey
 * over, and only three stay visible.
 */
@Composable
fun BoxScope.ToastHost(toaster: Toaster) {
    val toasts = toaster.toasts
    val front = toasts.lastOrNull { !it.leaving.value }
    LaunchedEffect(front?.id) {
        val toast = front ?: return@LaunchedEffect
        delay(2500L + toast.message.length * 50L)
        toaster.dismiss(toast)
    }
    Box(
        Modifier.align(Alignment.TopCenter).statusBarsPadding().padding(top = 16.dp, start = 16.dp, end = 16.dp)
            .widthIn(max = 400.dp).fillMaxWidth(),
    ) {
        val living = toasts.filterNot { it.leaving.value }
        toasts.forEach { toast ->
            key(toast.id) {
                val depth = (living.size - 1 - living.indexOf(toast)).let { if (toast.leaving.value) 0 else it }
                ToastCard(toast, depth, toasts.indexOf(toast).toFloat(), onDismiss = { toaster.dismiss(toast) }, onGone = { toaster.remove(toast) })
            }
        }
    }
}

@Composable
private fun ToastCard(toast: Toast, depth: Int, z: Float, onDismiss: () -> Unit, onGone: () -> Unit) {
    val colors = AppTheme.colors
    val spec = tween<Float>(400, easing = Motion.Settle)
    val enter = remember { Animatable(0f) }
    LaunchedEffect(Unit) { enter.animateTo(1f, spec) }
    val leave by animateFloatAsState(if (toast.leaving.value) 1f else 0f, spec, label = "leave", finishedListener = { if (it == 1f) onGone() })
    val stack by animateFloatAsState(depth.coerceAtMost(VISIBLE_COUNT).toFloat(), spec, label = "stack")
    val gapPx = with(LocalDensity.current) { StackGap.toPx() }
    val enterOffset = with(LocalDensity.current) { 24.dp.toPx() }

    val (background, content, on) = when (toast.type) {
        ToastType.Success -> Triple(colors.action, colors.onAction, ButtonOn.Action)
        ToastType.Error -> Triple(colors.danger, colors.onDanger, ButtonOn.Danger)
        ToastType.Warning -> Triple(colors.warn, colors.onWarn, ButtonOn.Ghost)
        ToastType.Info -> Triple(colors.surface, colors.onGhost, ButtonOn.Ghost)
    }
    val icon = when (toast.type) {
        ToastType.Success -> Lucide.Check
        ToastType.Error -> Lucide.CircleX
        ToastType.Warning -> Lucide.AlertTriangle
        ToastType.Info -> Lucide.Info
    }
    val hidden = depth >= VISIBLE_COUNT

    Box(
        Modifier
            .zIndex(z)
            .graphicsLayer {
                val e = enter.value
                alpha = e * (1f - leave) * if (hidden) 0f else 1f
                translationY = (1f - e) * -enterOffset + stack * gapPx
                val s = (0.9f + 0.1f * e) * (1f - stack * 0.05f)
                scaleX = s
                scaleY = s
                transformOrigin = androidx.compose.ui.graphics.TransformOrigin(0.5f, 0f)
            }
            .fillMaxWidth()
            .shadow(16.dp, CircleShape, ambientColor = Color.Black.copy(alpha = 0.12f), spotColor = Color.Black.copy(alpha = 0.12f))
            .clip(CircleShape)
            .background(background)
            .then(if (toast.type == ToastType.Info) Modifier.border(1.dp, colors.ghostBorder, CircleShape) else Modifier),
    ) {
        Row(Modifier.padding(4.dp), verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(8.dp)) {
            CompositionLocalProvider(LocalContentColor provides content) {
                Icon(icon, null, Modifier.padding(start = 10.dp, top = 10.dp, bottom = 10.dp), size = 20.dp)
                Text(
                    toast.message,
                    Modifier.weight(1f),
                    style = AppText.base.copy(lineHeight = 20.sp),
                    maxLines = 1,
                    overflow = TextOverflow.Ellipsis,
                )
                IconButton(Lucide.X, stringResource(R.string.a11y_close), onDismiss, on = on)
            }
        }
        // Toasts stacked behind grey over, 20% per step.
        Box(Modifier.matchParentSize().graphicsLayer { alpha = (stack * 0.2f).coerceAtMost(1f) }.background(colors.steel))
    }
}
