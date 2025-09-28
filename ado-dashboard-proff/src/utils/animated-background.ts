export default class AnimatedBackground {
    private canvas: HTMLCanvasElement;
    private ctx: CanvasRenderingContext2D;
    private grainCanvas: HTMLCanvasElement;
    private grainCtx: CanvasRenderingContext2D;
    private dpr: number;
    private width: number;
    private height: number;
    private time = 0;
    private rafId: number | null = null;
    private motionAllowed: boolean;
    private config = {
        baseColorA: "#0f172a",        // dunkel
        baseColorB: "#07103a",        // tiefer blauton
        accentA: "#6EE7B7",           // neon-soft
        accentB: "#7C4DFF",
        grainAlpha: 0.06,
        particleCount: 28,
        particleMaxSize: 90,
        meshIntensity: 0.9
    };

    constructor(canvasId: string, opts?: Partial<typeof AnimatedBackground.prototype["config"]>) {
        this.canvas = document.getElementById(canvasId) as HTMLCanvasElement;
        if (!this.canvas) throw new Error("Canvas not found: " + canvasId);
        const ctx = this.canvas.getContext("2d");
        if (!ctx) throw new Error("2D context not supported");
        this.ctx = ctx;

        // Offscreen grain canvas for performance; fallback to normal canvas if Offscreen not available
        this.grainCanvas = (typeof OffscreenCanvas !== "undefined")
            ? (new OffscreenCanvas(1, 1) as unknown as HTMLCanvasElement)
            : document.createElement("canvas");
        const grainCtx = (this.grainCanvas as any).getContext("2d");
        if (!grainCtx) throw new Error("Grain context not available");
        this.grainCtx = grainCtx;

        // Device pixel ratio for crispness
        this.dpr = Math.max(1, window.devicePixelRatio || 1);

        // Respect reduced motion preference
        this.motionAllowed = !window.matchMedia || !window.matchMedia("(prefers-reduced-motion: reduce)").matches;

        // Merge config overrides
        if (opts) Object.assign(this.config, opts);

        this.resize();
        this.generateGrain();
        this.initParticles();

        window.addEventListener("resize", () => { this.resize(); this.generateGrain(); });
        if ((this.grainCanvas as any).transferToImageBitmap) {
            // nothing extra needed but keep as comment for intent
        }

        this.start();
    }

    // -------------------------
    // Particles for organic movement
    // -------------------------
    private particles: {
        x: number;
        y: number;
        vx: number;
        vy: number;
        size: number;
        hueOffset: number;
        alpha: number;
    }[] = [];

    private initParticles() {
        this.particles.length = 0;
        const count = Math.max(6, Math.floor(this.config.particleCount));
        for (let i = 0; i < count; i++) {
            const size = 8 + Math.random() * (this.config.particleMaxSize - 8);
            this.particles.push({
                x: Math.random() * this.width,
                y: Math.random() * this.height,
                vx: (Math.random() - 0.5) * 0.15,
                vy: (Math.random() - 0.5) * 0.08,
                size,
                hueOffset: Math.random(),
                alpha: 0.05 + Math.random() * 0.25
            });
        }
    }

    // -------------------------
    // Resize and DPR handling
    // -------------------------
    private resize() {
        const w = Math.max(320, window.innerWidth);
        const h = Math.max(200, window.innerHeight);
        this.width = w;
        this.height = h;
        this.canvas.style.width = w + "px";
        this.canvas.style.height = h + "px";
        this.canvas.width = Math.round(w * this.dpr);
        this.canvas.height = Math.round(h * this.dpr);
        this.ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);

        // grain canvas
        this.grainCanvas.width = Math.round(w * this.dpr);
        this.grainCanvas.height = Math.round(h * this.dpr);

        // reinit particles to new bounds
        this.initParticles();
    }

    // -------------------------
    // Grain generation (fast, cached)
    // -------------------------
    private generateGrain() {
        const gc = this.grainCtx;
        const w = this.grainCanvas.width;
        const h = this.grainCanvas.height;
        // small pattern then scale for perf
        const patternSize = 256 * this.dpr;
        gc.clearRect(0, 0, w, h);
        const imgData = gc.createImageData(patternSize, patternSize);
        const data = imgData.data;
        for (let i = 0; i < data.length; i += 4) {
            const v = Math.floor(Math.random() * 255);
            data[i] = v;
            data[i + 1] = v;
            data[i + 2] = v;
            data[i + 3] = Math.floor(255 * this.config.grainAlpha);
        }
        gc.putImageData(imgData, 0, 0);
        // tile the pattern across the grain canvas
        const patternCanvas = document.createElement("canvas");
        patternCanvas.width = patternSize;
        patternCanvas.height = patternSize;
        const pctx = patternCanvas.getContext("2d")!;
        pctx.putImageData(imgData, 0, 0);
        const pat = gc.createPattern(patternCanvas, "repeat")!;
        gc.fillStyle = pat;
        gc.fillRect(0, 0, w, h);
    }

    // -------------------------
    // Start / Stop
    // -------------------------
    public start() {
        if (this.rafId != null) return;
        this.rafId = requestAnimationFrame(this.loop);
    }

    public stop() {
        if (this.rafId != null) {
            cancelAnimationFrame(this.rafId);
            this.rafId = null;
        }
    }

    // -------------------------
    // Main loop
    // -------------------------
    private loop = (t: number) => {
        this.time = t * 0.001; // seconds
        this.render();
        this.rafId = requestAnimationFrame(this.motionAllowed ? this.loop : this.idleLoop);
    };

    private idleLoop = (t: number) => {
        // very low-frequency updates when reduced-motion is enabled
        this.time = t * 0.001;
        if (Math.floor(this.time) % 4 === 0) this.render();
        this.rafId = requestAnimationFrame(this.idleLoop);
    };

    // -------------------------
    // Render passes
    // -------------------------
    private render() {
        const ctx = this.ctx;
        const w = this.width;
        const h = this.height;
        ctx.clearRect(0, 0, w, h);

        // Background base gradient (multi-stop mesh-like radial)
        this.drawMeshGradient();

        // Moving glow spot
        this.drawGlowSpot();

        // Organic particles / blobs
        this.drawParticles();

        // Subtle vignette and radial depth
        this.drawVignette();

        // Grain overlay with low alpha and 'soft-light' composite for texture
        ctx.save();
        ctx.globalCompositeOperation = "overlay";
        ctx.globalAlpha = 0.6 * this.config.grainAlpha;
        // scale drawImage if OffscreenCanvas used with different orientation
        ctx.drawImage(this.grainCanvas as any, 0, 0, w * this.dpr, h * this.dpr, 0, 0, w, h);
        ctx.restore();
    }

    // Mesh-like gradient using layered radial gradients for dimensional color
    private drawMeshGradient() {
        const ctx = this.ctx;
        const w = this.width;
        const h = this.height;

        // dark base
        const base = ctx.createLinearGradient(0, 0, w, h);
        base.addColorStop(0, this.config.baseColorA);
        base.addColorStop(1, this.config.baseColorB);
        ctx.fillStyle = base;
        ctx.fillRect(0, 0, w, h);

        // layered radial accents (mesh feel)
        const offsets = [
            { x: w * 0.15 + Math.sin(this.time * 0.3) * w * 0.03, y: h * 0.25, r: w * 0.45, color: this.config.accentA, alpha: 0.14 },
            { x: w * 0.85 + Math.cos(this.time * 0.2) * w * 0.02, y: h * 0.15 + Math.sin(this.time * 0.4) * h * 0.02, r: w * 0.35, color: this.config.accentB, alpha: 0.12 },
        ];

        for (const o of offsets) {
            const g = ctx.createRadialGradient(o.x, o.y, Math.max(10, o.r * 0.04), o.x, o.y, o.r);
            g.addColorStop(0, this.rgbaHex(o.color, 0.95 * o.alpha));
            g.addColorStop(0.35, this.rgbaHex(o.color, 0.35 * o.alpha));
            g.addColorStop(1, this.rgbaHex("#000000", 0));
            ctx.globalCompositeOperation = "screen";
            ctx.fillStyle = g;
            ctx.fillRect(0, 0, w, h);
        }

        ctx.globalCompositeOperation = "source-over";
    }

    // Single slowly moving glow to create focal depth
    private drawGlowSpot() {
        const ctx = this.ctx;
        const w = this.width;
        const h = this.height;

        const cx = w * (0.5 + Math.sin(this.time * 0.12) * 0.18);
        const cy = h * (0.35 + Math.cos(this.time * 0.08) * 0.12);
        const r = Math.max(w, h) * 0.4;

        const g = ctx.createRadialGradient(cx, cy, r * 0.02, cx, cy, r);
        g.addColorStop(0, this.rgbaHex(this.config.accentA, 0.95));
        g.addColorStop(0.25, this.rgbaHex(this.config.accentA, 0.28));
        g.addColorStop(0.6, this.rgbaHex(this.config.accentB, 0.08));
        g.addColorStop(1, this.rgbaHex("#000000", 0));
        ctx.globalCompositeOperation = "lighter";
        ctx.fillStyle = g;
        ctx.fillRect(0, 0, w, h);
        ctx.globalCompositeOperation = "source-over";
    }

    // Particles drawn as soft blurred circles with slow organic motion
    private drawParticles() {
        const ctx = this.ctx;
        const w = this.width;
        const h = this.height;
        for (let i = 0; i < this.particles.length; i++) {
            const p = this.particles[i];
            // update motion with gentle Perlin-like feel using sines
            p.x += p.vx + Math.sin(this.time * 0.2 + i) * 0.12;
            p.y += p.vy + Math.cos(this.time * 0.12 + i * 0.7) * 0.06;

            // wrap around bounds
            if (p.x < -p.size) p.x = w + p.size;
            if (p.x > w + p.size) p.x = -p.size;
            if (p.y < -p.size) p.y = h + p.size;
            if (p.y > h + p.size) p.y = -p.size;

            const radius = p.size * (0.6 + 0.4 * Math.sin(this.time * 0.6 + i));
            const hueA = this.config.accentA;
            ctx.save();
            ctx.globalAlpha = p.alpha * 0.9;
            ctx.filter = "blur(24px)";
            const grd = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, radius);
            grd.addColorStop(0, this.rgbaHex(hueA, 0.85));
            grd.addColorStop(0.5, this.rgbaHex(hueA, 0.25));
            grd.addColorStop(1, this.rgbaHex("#000000", 0));
            ctx.fillStyle = grd;
            ctx.beginPath();
            ctx.arc(p.x, p.y, radius, 0, Math.PI * 2);
            ctx.fill();
            ctx.restore();
        }
    }

    // Subtle vignette and center depth
    private drawVignette() {
        const ctx = this.ctx;
        const w = this.width;
        const h = this.height;
        const vg = ctx.createRadialGradient(w / 2, h / 2, Math.min(w, h) * 0.2, w / 2, h / 2, Math.max(w, h) * 0.8);
        vg.addColorStop(0, this.rgbaHex("#000000", 0));
        vg.addColorStop(1, this.rgbaHex("#000000", 0.45));
        ctx.fillStyle = vg;
        ctx.fillRect(0, 0, w, h);
    }

    // -------------------------
    // Utilities
    // -------------------------
    private rgbaHex(hex: string, alpha: number) {
        // simple hex -> rgba (supports #RRGGBB)
        const h = hex.replace("#", "");
        const r = parseInt(h.substring(0, 2), 16);
        const g = parseInt(h.substring(2, 4), 16);
        const b = parseInt(h.substring(4, 6), 16);
        return `rgba(${r}, ${g}, ${b}, ${alpha})`;
    }
}
