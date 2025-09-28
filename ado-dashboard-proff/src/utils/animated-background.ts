// PerformanceFirstAnimatedBackground.ts
export default class PerformanceFirstAnimatedBackground {
    private canvas: HTMLCanvasElement;
    private ctx: CanvasRenderingContext2D;
    private layerMid?: HTMLCanvasElement;
    private layerTop?: HTMLCanvasElement;
    private layerMidCtx?: CanvasRenderingContext2D;
    private layerTopCtx?: CanvasRenderingContext2D;

    private grainCanvas: HTMLCanvasElement;
    private grainCtx: CanvasRenderingContext2D;

    private dpr: number;
    private w = 0;
    private h = 0;
    private time = 0;
    private raf: number | null = null;
    private lastFrameTime = 0;
    private fpsSampleStart = 0;
    private frameCount = 0;
    private currentFPS = 60;

    private motionAllowed: boolean;
    private config = {
        particleCount: 18,
        blobCount: 3,
        maxBlobSize: 280,
        grainAlpha: 0.045,
        useLayers: true,         // enable splitting into layers
        targetFPS: 60,
        qualityScale: 1.0        // adaptive quality multiplier
    };

    // recycled arrays
    private particles: { x: number; y: number; vx: number; vy: number; size: number; hue: number }[] = [];
    private blobs: { x: number; y: number; r: number; speed: number; phase: number; colorIdx: number }[] = [];

    constructor(canvasId: string, opts?: Partial<typeof PerformanceFirstAnimatedBackground.prototype["config"]>) {
        const el = document.getElementById(canvasId);
        if (!el) throw new Error("Canvas not found: " + canvasId);
        if (!(el instanceof HTMLCanvasElement)) throw new Error("Element is not a canvas: " + canvasId);
        this.canvas = el;
        const ctx = this.canvas.getContext("2d");
        if (!ctx) throw new Error("2D context not available");
        this.ctx = ctx;

        if (opts) Object.assign(this.config, opts);

        this.dpr = Math.max(1, Math.min(2, window.devicePixelRatio || 1));
        this.motionAllowed = !window.matchMedia || !window.matchMedia("(prefers-reduced-motion: reduce)").matches;

        // Create optional layer canvases to separate static vs dynamic drawing
        if (this.config.useLayers) {
            this.layerMid = document.createElement("canvas");
            this.layerTop = document.createElement("canvas");
            this.layerMid.style.position = this.layerTop.style.position = "absolute";
            this.layerMid.style.left = this.layerTop.style.left = "0";
            this.layerMid.style.top = this.layerTop.style.top = "0";
            this.layerMid.style.pointerEvents = this.layerTop.style.pointerEvents = "none";
            this.canvas.parentElement?.appendChild(this.layerMid);
            this.canvas.parentElement?.appendChild(this.layerTop);
            this.layerMidCtx = this.layerMid.getContext("2d")!;
            this.layerTopCtx = this.layerTop.getContext("2d")!;
        }

        // Grain canvas (Offscreen where available)
        if (typeof OffscreenCanvas !== "undefined") {
            const oc = new OffscreenCanvas(128, 128) as unknown as HTMLCanvasElement;
            this.grainCanvas = oc;
        } else {
            this.grainCanvas = document.createElement("canvas");
        }
        const gctx = (this.grainCanvas as any).getContext("2d");
        if (!gctx) throw new Error("Grain context not available");
        this.grainCtx = gctx;

        this.initSize();
        this.initCaches();
        this.initEntities();

        // adaptive FPS monitoring
        window.addEventListener("resize", () => this.onResize());
        this.fpsSampleStart = performance.now();
        this.start();
    }

    // -----------------------------
    // Initialization and caches
    // -----------------------------
    private initSize() {
        const rawW = Math.max(320, window.innerWidth);
        const rawH = Math.max(200, window.innerHeight);
        this.w = rawW;
        this.h = rawH;

        // set CSS pixel sizes
        this.canvas.style.width = rawW + "px";
        this.canvas.style.height = rawH + "px";
        this.canvas.width = Math.round(rawW * this.dpr);
        this.canvas.height = Math.round(rawH * this.dpr);
        this.ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);

        if (this.layerMid && this.layerTop) {
            this.layerMid.style.width = this.layerTop.style.width = rawW + "px";
            this.layerMid.style.height = this.layerTop.style.height = rawH + "px";
            this.layerMid.width = Math.round(rawW * this.dpr);
            this.layerMid.height = Math.round(rawH * this.dpr);
            this.layerTop.width = Math.round(rawW * this.dpr);
            this.layerTop.height = Math.round(rawH * this.dpr);
            this.layerMidCtx!.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
            this.layerTopCtx!.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
        }

        this.grainCanvas.width = 128 * this.dpr;
        this.grainCanvas.height = 128 * this.dpr;
    }

    private initCaches() {
        // Pre-generate grain once and reuse as pattern (avoid per-frame ImageData) - (best practice).
        this.generateGrainPattern();
        // Cache static gradient for base background
        this.createBaseGradient();
    }

    // Precomputed objects
    private baseGradient?: CanvasGradient;
    private grainPattern?: CanvasPattern;

    private createBaseGradient() {
        // Cached linear gradient; re-create on resize only
        this.baseGradient = this.ctx.createLinearGradient(0, 0, this.w, this.h);
        this.baseGradient.addColorStop(0, "#061028");
        this.baseGradient.addColorStop(0.5, "#0f2746");
        this.baseGradient.addColorStop(1, "#071028");
    }

    private generateGrainPattern() {
        const g = this.grainCtx;
        const pw = this.grainCanvas.width;
        const ph = this.grainCanvas.height;
        // fill once with random noise using typed array for speed
        const img = g.createImageData(pw, ph);
        const alpha = Math.max(1, Math.floor(255 * this.config.grainAlpha));
        for (let i = 0; i < img.data.length; i += 4) {
            const v = (Math.random() * 255) | 0;
            img.data[i] = v;
            img.data[i + 1] = v;
            img.data[i + 2] = v;
            img.data[i + 3] = alpha;
        }
        g.putImageData(img, 0, 0);
        // create pattern
        this.grainPattern = g.createPattern(this.grainCanvas as any, "repeat")!;
    }

    // -----------------------------
    // Entities (recycled)
    // -----------------------------
    private initEntities() {
        // blobs (large, slow, blurred) - few items for depth
        this.blobs = [];
        for (let i = 0; i < this.config.blobCount; i++) {
            this.blobs.push({
                x: Math.random() * this.w,
                y: Math.random() * this.h,
                r: 120 + Math.random() * (this.config.maxBlobSize - 120),
                speed: 0.01 + Math.random() * 0.04,
                phase: Math.random() * Math.PI * 2,
                colorIdx: i % 3
            });
        }

        // particles (small glows) but intentionally limited for perf
        this.particles = [];
        for (let i = 0; i < this.config.particleCount; i++) {
            this.particles.push({
                x: Math.random() * this.w,
                y: Math.random() * this.h,
                vx: (Math.random() - 0.5) * 0.6,
                vy: (Math.random() - 0.5) * 0.2,
                size: 6 + Math.random() * 30,
                hue: Math.random()
            });
        }
    }

    // -----------------------------
    // Resize handler
    // -----------------------------
    private onResize() {
        this.initSize();
        this.initCaches();
        // don't reinit entities heavily; keep positions to avoid GC spikes
    }

    // -----------------------------
    // Start / Stop + adaptive quality
    // -----------------------------
    public start() {
        if (this.raf) return;
        this.lastFrameTime = performance.now();
        this.raf = requestAnimationFrame(this.tick);
    }

    public stop() {
        if (this.raf) cancelAnimationFrame(this.raf);
        this.raf = null;
    }

    private tick = (now: number) => {
        // compute delta and update FPS sample
        const dt = now - this.lastFrameTime;
        this.lastFrameTime = now;

        // update FPS every 500ms to adapt quality (simple adaptive throttling).
        this.frameCount++;
        if (now - this.fpsSampleStart > 500) {
            this.currentFPS = (this.frameCount * 1000) / (now - this.fpsSampleStart);
            this.fpsSampleStart = now;
            this.frameCount = 0;
            // lower quality when FPS drops
            if (this.currentFPS < 45) {
                this.config.qualityScale = 0.6;
            } else if (this.currentFPS < 30) {
                this.config.qualityScale = 0.45;
            } else {
                this.config.qualityScale = 1.0;
            }
        }

        // throttle heavy rendering for very low devices (skip frames when needed)
        const skipFactor = Math.max(1, Math.round(1 / this.config.qualityScale));
        if (Math.floor(now / (16 * skipFactor)) === Math.floor(this.time / (16 * skipFactor))) {
            // no-op to reduce CPU on low devices
        } else {
            this.time = now;
            if (this.motionAllowed) this.updateAndRender(dt);
            else {
                // render infrequently for reduced-motion users
                if (now % 1000 < 16) this.updateAndRender(dt);
            }
        }

        this.raf = requestAnimationFrame(this.tick);
    };

    // -----------------------------
    // Update + Render pipeline
    // -----------------------------
    private updateAndRender(dt: number) {
        // update entities
        this.updateEntities(dt);

        // render pipeline split to layers to minimize redraws (MDN recommends multi-layer canvases for complex scenes).
        if (this.config.useLayers && this.layerMidCtx && this.layerTopCtx) {
            // static base drawn to main canvas only when size or palette changes, here we redraw every frame but it's lightweight
            this.ctx.clearRect(0, 0, this.w, this.h);
            this.drawBase(this.ctx);

            // mid-layer: blobs (blur can be set once via CSS filter on canvas for cheaper GPU-based blur)
            this.layerMidCtx!.clearRect(0, 0, this.w, this.h);
            this.drawBlobs(this.layerMidCtx!);

            // top-layer: particles (small, many, but limited)
            this.layerTopCtx!.clearRect(0, 0, this.w, this.h);
            this.drawParticlesLayer(this.layerTopCtx!);

        } else {
            // single-canvas fallback (fewer contexts but more draw calls)
            this.ctx.clearRect(0, 0, this.w, this.h);
            this.drawBase(this.ctx);
            this.drawBlobs(this.ctx);
            this.drawParticlesLayer(this.ctx);
        }

        // final composite: grain overlay applied once via single drawImage / pattern - avoid per-pixel operations
        this.ctx.save();
        if (this.grainPattern) {
            this.ctx.globalAlpha = this.config.grainAlpha;
            this.ctx.fillStyle = this.grainPattern;
            // draw pattern scaled to css pixels (pattern originates at grainCanvas size)
            this.ctx.fillRect(0, 0, this.w, this.h);
            this.ctx.globalAlpha = 1;
        }
        this.ctx.restore();
    }

    // -----------------------------
    // Update entity positions (cheap math)
    // -----------------------------
    private updateEntities(dt: number) {
        const s = dt * 0.001;
        // particles movement: cheap sin/cos + velocity, no object allocations
        for (let i = 0; i < this.particles.length; i++) {
            const p = this.particles[i];
            p.x += p.vx * s * 60 + Math.sin((this.time * 0.0008) + i) * 0.25;
            p.y += p.vy * s * 60 + Math.cos((this.time * 0.0006) + i * 0.7) * 0.12;
            // wrap using integer math for fewer GC
            if (p.x < -60) p.x = this.w + 60;
            if (p.x > this.w + 60) p.x = -60;
            if (p.y < -60) p.y = this.h + 60;
            if (p.y > this.h + 60) p.y = -60;
        }

        // blobs: slow orbital motion
        for (let i = 0; i < this.blobs.length; i++) {
            const b = this.blobs[i];
            b.phase += b.speed * 0.6;
            b.x += Math.sin(this.time * 0.0003 + b.phase) * 0.35;
            b.y += Math.cos(this.time * 0.0002 + b.phase * 0.7) * 0.18;
            // keep in bounds
            if (b.x < -b.r) b.x = this.w + b.r;
            if (b.x > this.w + b.r) b.x = -b.r;
            if (b.y < -b.r) b.y = this.h + b.r;
            if (b.y > this.h + b.r) b.y = -b.r;
        }
    }

    // -----------------------------
    // Draw helpers (use integer drawing where possible) - avoid heavy filters
    // -----------------------------
    private drawBase(ctx: CanvasRenderingContext2D) {
        // cached base gradient (cheap fillRect)
        if (this.baseGradient) {
            ctx.fillStyle = this.baseGradient;
            ctx.fillRect(0, 0, this.w, this.h);
        } else {
            ctx.fillStyle = "#071028";
            ctx.fillRect(0, 0, this.w, this.h);
        }
    }

    private drawBlobs(ctx: CanvasRenderingContext2D) {
        // prefer CSS blur on canvas element instead of ctx.filter when possible
        // draw few large radial gradients; reuse gradient objects per blob where possible (created per draw but cheap due to small count)
        ctx.globalCompositeOperation = "lighter";
        for (let i = 0; i < this.blobs.length; i++) {
            const b = this.blobs[i];
            // integer coords to avoid subpixel anti-aliasing overhead
            const cx = (b.x | 0);
            const cy = (b.y | 0);
            const r = (b.r * (0.9 + 0.08 * Math.sin(this.time * 0.0006 + i))) | 0;
            const g = ctx.createRadialGradient(cx, cy, Math.max(4, r * 0.02), cx, cy, r);
            const color = i === 0 ? "rgba(77,216,201,0.95)" : i === 1 ? "rgba(139,92,246,0.85)" : "rgba(120,200,255,0.75)";
            g.addColorStop(0, color);
            g.addColorStop(0.4, color.replace("0.95", "0.28").replace("0.85", "0.28").replace("0.75", "0.28"));
            g.addColorStop(1, "rgba(0,0,0,0)");
            ctx.fillStyle = g;
            ctx.beginPath();
            ctx.arc(cx, cy, r, 0, Math.PI * 2);
            ctx.fill();
        }
        ctx.globalCompositeOperation = "source-over";
    }

    private drawParticlesLayer(ctx: CanvasRenderingContext2D) {
        ctx.globalCompositeOperation = "lighter";
        // small glows drawn as filled arcs with blur via shadow (cheaper than ctx.filter blur on some platforms)
        for (let i = 0; i < this.particles.length; i++) {
            const p = this.particles[i];
            const x = (p.x | 0);
            const y = (p.y | 0);
            const size = Math.max(2, (p.size * this.config.qualityScale) | 0);
            // shadow used to create cheap soft glow
            ctx.save();
            ctx.beginPath();
            ctx.fillStyle = `rgba(160,220,255,0.9)`;
            ctx.shadowBlur = Math.max(6, size * 0.4);
            ctx.shadowColor = `rgba(160,220,255,0.55)`;
            ctx.arc(x, y, size * 0.45, 0, Math.PI * 2);
            ctx.fill();
            ctx.restore();
        }
        ctx.globalCompositeOperation = "source-over";
    }
}
