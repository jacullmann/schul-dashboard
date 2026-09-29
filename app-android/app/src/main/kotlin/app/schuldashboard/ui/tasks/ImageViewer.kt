package app.schuldashboard.ui.tasks

import android.content.Intent
import android.net.Uri
import androidx.compose.animation.AnimatedVisibility
import androidx.compose.animation.core.Animatable
import androidx.compose.animation.core.animateFloat
import androidx.compose.animation.core.tween
import androidx.compose.animation.fadeIn
import androidx.compose.animation.fadeOut
import androidx.compose.foundation.clickable
import androidx.compose.foundation.gestures.Orientation
import androidx.compose.foundation.gestures.detectTapGestures
import androidx.compose.foundation.gestures.detectTransformGestures
import androidx.compose.foundation.gestures.draggable
import androidx.compose.foundation.gestures.rememberDraggableState
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.pager.HorizontalPager
import androidx.compose.foundation.pager.rememberPagerState
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableFloatStateOf
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.graphicsLayer
import androidx.compose.ui.input.pointer.pointerInput
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.platform.LocalDensity
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.unit.dp
import app.schuldashboard.R
import app.schuldashboard.data.Cloudinary
import app.schuldashboard.data.api.ImageItem
import app.schuldashboard.ui.design.BackdropBlurSupported
import app.schuldashboard.ui.design.LocalOverlayInsets
import app.schuldashboard.ui.design.Menu
import app.schuldashboard.ui.design.MenuButton
import app.schuldashboard.ui.design.OverlayBackdrop
import app.schuldashboard.ui.design.OverlayWindow
import app.schuldashboard.ui.design.frosted
import app.schuldashboard.ui.icons.Icon
import app.schuldashboard.ui.icons.Lucide
import app.schuldashboard.ui.icons.LucideIcon
import app.schuldashboard.ui.theme.AppText
import app.schuldashboard.ui.theme.Motion
import app.schuldashboard.ui.theme.Radius
import coil.compose.AsyncImage
import dev.chrisbanes.haze.HazeState
import dev.chrisbanes.haze.hazeSource
import dev.chrisbanes.haze.rememberHazeState
import kotlinx.coroutines.delay
import kotlinx.coroutines.launch

private const val MAX_ZOOM = 5f
private const val DISMISS_DP = 100

/**
 * ImageViewer: the images over the dimmed page, rounded and fitted inside a 16dp margin, with
 * the close button and menu in round translucent chips and the count below. Swiping sideways
 * pages, pinching zooms, dragging down lets go of the viewer, and a tap hides the controls.
 */
@Composable
fun ImageViewer(
    images: List<ImageItem>,
    startIndex: Int,
    canDelete: (ImageItem) -> Boolean,
    onDelete: (ImageItem) -> Unit,
    onDismiss: () -> Unit,
) {
    var open by remember { mutableStateOf(true) }
    val close = { open = false }
    LaunchedEffect(open) {
        if (!open) {
            delay(300)
            onDismiss()
        }
    }

    OverlayWindow(open, close) { transition ->
        val pager = rememberPagerState(startIndex) { images.size }
        val context = LocalContext.current
        val scope = rememberCoroutineScope()
        val insets = LocalOverlayInsets.current
        val drag = remember { Animatable(0f) }
        val dismissPx = with(LocalDensity.current) { DISMISS_DP.dp.toPx() }
        var controls by remember { mutableStateOf(true) }
        var zoomed by remember { mutableStateOf(false) }
        var menu by remember { mutableStateOf(false) }
        val shown by transition.animateFloat(
            { if (targetState) tween(300, easing = Motion.Settle) else tween(200, easing = Motion.Exit) }, label = "shown",
        ) { if (it) 1f else 0f }
        val current = images.getOrNull(pager.currentPage)
        val frame = rememberHazeState(blurEnabled = BackdropBlurSupported)

        // BaseBackdrop's 12px blur and 40% dim, both let go together as the image is dragged away;
        // the image itself stays opaque.
        OverlayBackdrop(12f, Color.Black.copy(alpha = 0.4f), strength = { shown * (1f - (drag.value / (dismissPx * 3)).coerceIn(0f, 1f)) })
        Box(Modifier.fillMaxSize().graphicsLayer { alpha = shown }) {
            HorizontalPager(
                pager,
                Modifier.fillMaxSize()
                    .hazeSource(frame)
                    .graphicsLayer {
                        translationY = drag.value
                        val s = 0.9f + 0.1f * shown
                        scaleX = s
                        scaleY = s
                    }
                    .draggable(
                        rememberDraggableState { delta -> scope.launch { drag.snapTo((drag.value + delta).coerceAtLeast(0f)) } },
                        Orientation.Vertical,
                        enabled = !zoomed,
                        onDragStopped = { velocity ->
                            if (drag.value > dismissPx || velocity > 1500f) close()
                            else drag.animateTo(0f, tween(250, easing = Motion.Settle))
                        },
                    ),
                userScrollEnabled = !zoomed,
                beyondViewportPageCount = 1,
            ) { page ->
                ZoomableImage(
                    images[page],
                    onZoomChange = { zoomed = it },
                    onTap = { controls = !controls },
                    modifier = Modifier.padding(start = 16.dp, end = 16.dp, top = 16.dp + insets.top, bottom = 16.dp + insets.bottom),
                )
            }

            AnimatedVisibility(controls, enter = fadeIn(tween(300)), exit = fadeOut(tween(300))) {
                Box(Modifier.fillMaxSize().padding(start = 16.dp, end = 16.dp, top = 16.dp + insets.top, bottom = 16.dp + insets.bottom)) {
                    Chip(Lucide.X, stringResource(R.string.a11y_close), close, frame, Modifier.align(Alignment.TopStart))
                    if (current != null && (Cloudinary.isDocument(current) || canDelete(current))) {
                        Chip(Lucide.Ellipsis, stringResource(R.string.a11y_more), { menu = true }, frame, Modifier.align(Alignment.TopEnd))
                    }
                    Text(
                        "${pager.currentPage + 1} / ${images.size}",
                        Modifier.align(Alignment.BottomCenter).clip(CircleShape).frosted(frame, 4f, Color.Black.copy(alpha = 0.6f))
                            .padding(horizontal = 12.dp, vertical = 4.dp),
                        style = AppText.sm,
                        color = Color.White,
                    )
                }
            }
        }

        Menu(menu, { menu = false }) {
            if (current != null && Cloudinary.isDocument(current)) {
                MenuButton(stringResource(R.string.viewer_open), {
                    menu = false
                    context.startActivity(Intent(Intent.ACTION_VIEW, Uri.parse(Cloudinary.originalUrl(current))))
                }, icon = Lucide.FileText)
            }
            if (current != null && canDelete(current)) {
                MenuButton(stringResource(R.string.action_delete), {
                    menu = false
                    onDelete(current)
                    close()
                }, icon = Lucide.Trash2, danger = true)
            }
        }
    }
}

/** The viewer's round controls: white glyphs on 60% black, frosted over the image behind. */
@Composable
private fun Chip(icon: LucideIcon, description: String, onClick: () -> Unit, backdrop: HazeState, modifier: Modifier) {
    Box(
        modifier.clip(CircleShape).frosted(backdrop, 4f, Color.Black.copy(alpha = 0.6f)).clickable(onClick = onClick).padding(8.dp),
    ) { Icon(icon, description, tint = Color.White) }
}

@Composable
private fun ZoomableImage(image: ImageItem, onZoomChange: (Boolean) -> Unit, onTap: () -> Unit, modifier: Modifier) {
    var scale by remember { mutableFloatStateOf(1f) }
    var offsetX by remember { mutableFloatStateOf(0f) }
    var offsetY by remember { mutableFloatStateOf(0f) }
    Box(
        modifier.fillMaxSize()
            .pointerInput(Unit) { detectTapGestures(onTap = { onTap() }) }
            .pointerInput(Unit) {
                detectTransformGestures { _, pan, zoom, _ ->
                    scale = (scale * zoom).coerceIn(1f, MAX_ZOOM)
                    if (scale == 1f) {
                        offsetX = 0f
                        offsetY = 0f
                    } else {
                        offsetX += pan.x
                        offsetY += pan.y
                    }
                    onZoomChange(scale > 1f)
                }
            },
        contentAlignment = Alignment.Center,
    ) {
        AsyncImage(
            model = Cloudinary.full(image),
            contentDescription = image.metadata?.name,
            contentScale = ContentScale.Fit,
            modifier = Modifier
                .graphicsLayer(scaleX = scale, scaleY = scale, translationX = offsetX, translationY = offsetY)
                .clip(RoundedCornerShape(Radius.xl)),
        )
    }
}
