export default class AnimatedBackground {
    private canvas: HTMLCanvasElement;
    private ctx: CanvasRenderingContext2D;
    private grainCanvas: HTMLCanvasElement;
    private grainCtx: CanvasRenderingContext2D;
    private dpr: number;
    private w: number;
    private h: number;
    private t = 0;
    private raf: number | null = null;
    private motionAllowed: boolean;
    private quality = { particleStep: 1, grainAlpha: 0.04, blur: 18 };
    private config: {
        palette: string[];
        accentStrength: number;
        particleCount: number;
        maxBlobSize: number;
        chromatic: number;
    };

    constructor(canvasId: string, opts?: Partial<{
        palette: string[]; accentStrength: number; particleCount: number; maxBlobSize: number; chromatic: number;
    }>) {
        const el = document.getElementById(canvasId);
        if (!el || !(el instanceof HTMLCanvasElement)) throw new Error("Canvas not found: " + canvasId);
        this.canvas = el;
        const ctx = this.canvas.getContext("2d");
        if (!ctx) throw new Error("2D context not available");
        this.ctx = ctx;

        this.dpr = Math.max(1, Math.min(2.5, window.devicePixelRatio || 1));
        this.motionAllowed = !window.matchMedia || !window.matchMedia("(prefers-reduced-motion: reduce)").matches;

        // sensible modern 2025 palette: deep-space base, neon spectral accents
        this.config = {
            palette: ["#071028", "#0a1b3a", "#14213d", "#4dd8c9", "#8b5cf6"],
            accentStrength: 0.9,
            particleCount: 30,
            maxBlobSize: 320,
            chromatic: 0.8,
            ...(opts || {})
        };

        // grain canvas (Offscreen when available)
        if (typeof OffscreenCanvas !== "undefined") {
            const oc = new OffscreenCanvas(1, 1) as unknown as HTMLCanvasElement;
            this.grainCanvas = oc;
        } else {
            this.grainCanvas = document.createElement("canvas");
        }
        const gctx = (this.grainCanvas as any).getContext("2d");
        if (!gctx) throw new Error("Grain context not available");
        this.grainCtx = gctx;

        this.resize();
        this.generateGrain();
        this.initBlobs();
        this.handleResize = this.handleResize.bind(this);
        window.addEventListener("resize", this.handleResize);
        this.start();
    }

    // -------------------------
    // Responsiveness and DPR
    // -------------------------
    private handleResize() {
        this.resize();
        this.generateGrain();
        this.resetBlobs();
    }

    private resize() {
        const rawW = Math.max(320, window.innerWidth);
        const rawH = Math.max(200, window.innerHeight);
        this.w = rawW;
        this.h = rawH;
        this.canvas.style.width = rawW + "px";
        this.canvas.style.height = rawH + "px";
        this.canvas.width = Math.round(rawW * this.dpr);
        this.canvas.height = Math.round(rawH * this.dpr);
        this.ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);

        this.grainCanvas.width = Math.round(rawW * this.dpr);
        this.grainCanvas.height = Math.round(rawH * this.dpr);
    }

    // -------------------------
    // Grain
    // -------------------------
    private generateGrain() {
        const g = this.grainCtx;
        const pw = Math.min(512, this.grainCanvas.width);
        const ph = Math.min(512, this.grainCanvas.height);
        // small pattern then repeated
        const img = g.createImageData(pw, ph);
        for (let i = 0; i < img.data.length; i += 4) {
            const v = Math.floor(Math.random() * 255);
            img.data[i] = v;
            img.data[i + 1] = v;
            img.data[i + 2] = v;
            img.data[i + 3] = Math.floor(255 * this.quality.grainAlpha);
        }
        g.clearRect(0, 0, this.grainCanvas.width, this.grainCanvas.height);
        const temp = document.createElement("canvas");
        temp.width = pw;
        temp.height = ph;
        const tctx = temp.getContext("2d")!;
        tctx.putImageData(img, 0, 0);
        const pattern = g.createPattern(temp, "repeat")!;
        g.fillStyle = pattern;
        g.fillRect(0, 0, this.grainCanvas.width, this.grainCanvas.height);
    }

    // -------------------------
    // Blob layer (organic moving shapes)
    // -------------------------
    private blobs: { x: number; y: number; r: number; speed: number; phase: number; colorIdx: number }[] = [];

    private initBlobs() {
        this.blobs = [];
        const count = Math.max(3, Math.floor(this.config.particleCount / 6));
        for (let i = 0; i < count; i++) {
            this.blobs.push({
                x: Math.random() * this.w,
                y: Math.random() * this.h,
                r: 140 + Math.random() * (this.config.maxBlobSize - 140),
                speed: 0.01 + Math.random() * 0.035,
                phase: Math.random() * Math.PI * 2,
                colorIdx: i % this.config.palette.length
            });
        }
    }

    private resetBlobs() {
        this.initBlobs();
    }

    // -------------------------
    // Particles (delicate lines & glows)
    // -------------------------
    private particles: { x: number; y: number; vx: number; vy: number; size: number; hue: number }[] = [];

    private initParticles() {
        this.particles = [];
        const count = this.config.particleCount;
        for (let i = 0; i < count; i++) {
            this.particles.push({
                x: Math.random() * this.w,
                y: Math.random() * this.h,
                vx: (Math.random() - 0.5) * 0.6,
                vy: (Math.random() - 0.5) * 0.25,
                size: 6 + Math.random() * 28,
                hue: Math.random()
            });
        }
    }

    // -------------------------
    // Start / Stop
    // -------------------------
    public start() {
        if (this.raf) return;
        if (this.particles.length === 0) this.initParticles();
        this.raf = requestAnimationFrame(this.loop);
    }

    public stop() {
        if (this.raf) cancelAnimationFrame(this.raf);
        this.raf = null;
    }

    // -------------------------
    // Main loop with adaptive detail
    // -------------------------
    private loop = (now: number) => {
        this.t = now * 0.001;
        if (!this.motionAllowed) {
            // when reduced motion, render very slowly (every 1s)
            if (Math.floor(this.t) % 1 === 0) this.draw();
            this.raf = requestAnimationFrame(this.loop);
        } else {
            this.draw();
            this.raf = requestAnimationFrame(this.loop);
        }
    };

    // -------------------------
    // Draw pipeline
    // -------------------------
    private draw() {
        const ctx = this.ctx;
        ctx.clearRect(0, 0, this.w, this.h);

        // 1) Base spectral mesh (layered soft radial + linear gradients)
        this.drawSpectralMesh();

        // 2) Dynamic organic blobs with spectral blending and subtle chromatic aberration
        this.drawBlobs();

        // 3) Particle lines and glows (fine, slow motion)
        this.drawParticlesLayer();

        // 4) Center soft radial light to create focal depth
        this.drawCenterGlow();

        // 5) Chromatic slight offset pass for modern filmic edge
        this.drawChromaticEdge();

        // 6) Grain overlay and final vignette
        ctx.save();
        ctx.globalCompositeOperation = "overlay";
        ctx.globalAlpha = 0.7;
        ctx.drawImage(this.grainCanvas as any, 0, 0, this.w * this.dpr, this.h * this.dpr, 0, 0, this.w, this.h);
        ctx.restore();

        this.drawVignette();
    }

    // -------------------------
    // Layer implementations
    // -------------------------
    private drawSpectralMesh() {
        const ctx = this.ctx;
        // diagonal linear base
        const lg = ctx.createLinearGradient(0, 0, this.w, this.h);
        lg.addColorStop(0, this.fade(this.config.palette[0], 1));
        lg.addColorStop(0.5, this.fade(this.config.palette[2], 1));
        lg.addColorStop(1, this.fade(this.config.palette[1], 1));
        ctx.fillStyle = lg;
        ctx.fillRect(0, 0, this.w, this.h);

        // subtle moving radial accents for "mesh" depth
        const accent = [
            { x: this.w * 0.2 + Math.sin(this.t * 0.18) * this.w * 0.04, y: this.h * 0.22, r: this.w * 0.6, color: this.config.palette[3], alpha: 0.12 },
            { x: this.w * 0.8 + Math.cos(this.t * 0.12) * this.w * 0.03, y: this.h * 0.15 + Math.sin(this.t * 0.3) * this.h * 0.03, r: this.w * 0.4, color: this.config.palette[4], alpha: 0.1 }
        ];
        ctx.globalCompositeOperation = "screen";
        for (const a of accent) {
            const g = ctx.createRadialGradient(a.x, a.y, Math.max(8, a.r * 0.02), a.x, a.y, a.r);
            g.addColorStop(0, this.fade(a.color, a.alpha));
            g.addColorStop(0.5, this.fade(a.color, a.alpha * 0.35));
            g.addColorStop(1, this.fade("#000000", 0));
            ctx.fillStyle = g;
            ctx.fillRect(0, 0, this.w, this.h);
        }
        ctx.globalCompositeOperation = "source-over";
    }

    private drawBlobs() {
        const ctx = this.ctx;
        ctx.save();
        ctx.globalCompositeOperation = "lighter";
        ctx.filter = `blur(${this.quality.blur}px)`;
        for (let i = 0; i < this.blobs.length; i++) {
            const b = this.blobs[i];
            // update simple orbital motion
            b.phase += b.speed * 0.8;
            b.x += Math.sin(this.t * b.speed * 0.6 + b.phase) * 0.6;
            b.y += Math.cos(this.t * b.speed * 0.5 + b.phase * 0.7) * 0.4;
            const cx = b.x % this.w;
            const cy = b.y % this.h;
            const r = b.r * (0.9 + 0.08 * Math.sin(this.t * 0.6 + i));
            const grad = ctx.createRadialGradient(cx, cy, Math.max(4, r * 0.02), cx, cy, r);
            const color = this.config.palette[b.colorIdx % this.config.palette.length];
            grad.addColorStop(0, this.fade(color, 0.95 * this.config.accentStrength));
            grad.addColorStop(0.35, this.fade(color, 0.28 * this.config.accentStrength));
            grad.addColorStop(1, this.fade("#000000", 0));
            ctx.fillStyle = grad;
            ctx.beginPath();
            ctx.arc(cx, cy, r, 0, Math.PI * 2);
            ctx.fill();
        }
        ctx.filter = "none";
        ctx.restore();
    }

    private drawParticlesLayer() {
        const ctx = this.ctx;
        ctx.save();
        ctx.globalCompositeOperation = "lighter";
        for (let i = 0; i < this.particles.length; i += this.quality.particleStep) {
            const p = this.particles[i];
            // motion
            p.x += p.vx + Math.sin(this.t * 0.25 + i) * 0.08;
            p.y += p.vy + Math.cos(this.t * 0.15 + i * 0.6) * 0.04;
            // wrap
            if (p.x < -50) p.x = this.w + 50;
            if (p.x > this.w + 50) p.x = -50;
            if (p.y < -50) p.y = this.h + 50;
            if (p.y > this.h + 50) p.y = -50;

            // soft glow
            const grd = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.size);
            const col = this.lerpColor(this.config.palette[3], this.config.palette[4], p.hue);
            grd.addColorStop(0, this.fade(col, 0.9));
            grd.addColorStop(0.4, this.fade(col, 0.22));
            grd.addColorStop(1, this.fade("#000000", 0));
            ctx.globalAlpha = 0.75;
            ctx.filter = "blur(8px)";
            ctx.fillStyle = grd;
            ctx.beginPath();
            ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
            ctx.fill();
            ctx.filter = "none";
        }
        ctx.globalAlpha = 1;
        ctx.restore();
    }

    private drawCenterGlow() {
        const ctx = this.ctx;
        ctx.save();
        ctx.globalCompositeOperation = "screen";
        const cx = this.w * (0.5 + Math.sin(this.t * 0.07) * 0.06);
        const cy = this.h * (0.45 + Math.cos(this.t * 0.05) * 0.04);
        const r = Math.max(this.w, this.h) * 0.5;
        const g = ctx.createRadialGradient(cx, cy, r * 0.01, cx, cy, r);
        g.addColorStop(0, this.fade(this.config.palette[3], 0.95));
        g.addColorStop(0.25, this.fade(this.config.palette[3], 0.22));
        g.addColorStop(0.7, this.fade(this.config.palette[4], 0.06));
        g.addColorStop(1, this.fade("#000000", 0));
        ctx.fillStyle = g;
        ctx.fillRect(0, 0, this.w, this.h);
        ctx.restore();
    }

    // subtle chromatic edges by drawing offsets with low alpha
    private drawChromaticEdge() {
        if (this.config.chromatic <= 0) return;
        const ctx = this.ctx;
        const offset = 8 * this.config.chromatic * (this.dpr / 2);
        ctx.save();
        ctx.globalCompositeOperation = "lighter";
        ctx.globalAlpha = 0.035 * this.config.chromatic;

        // red-pass
        ctx.translate(-offset, 0);
        ctx.fillStyle = this.fade("#ff6b6b", 1);
        ctx.fillRect(0, 0, this.w, this.h);

        // green-pass
        ctx.setTransform(1, 0, 0, 1, 0, 0);
        ctx.globalAlpha = 0.03 * this.config.chromatic;
        ctx.translate(offset * 0.6, 0);
        ctx.fillStyle = this.fade("#7ef9c7", 1);
        ctx.fillRect(0, 0, this.w, this.h);

        ctx.restore();
    }

    private drawVignette() {
        const ctx = this.ctx;
        const vg = ctx.createRadialGradient(this.w / 2, this.h / 2, Math.min(this.w, this.h) * 0.25, this.w / 2, this.h / 2, Math.max(this.w, this.h) * 0.95);
        vg.addColorStop(0, this.fade("#000000", 0));
        vg.addColorStop(1, this.fade("#000000", 0.5));
        ctx.save();
        ctx.globalCompositeOperation = "multiply";
        ctx.fillStyle = vg;
        ctx.fillRect(0, 0, this.w, this.h);
        ctx.restore();
    }

    // -------------------------
    // Utility color helpers
    // -------------------------
    private fade(hex: string, a: number) {
        const rgb = this.hexToRgb(hex);
        return `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, ${a})`;
    }

    private hexToRgb(hex: string) {
        const h = hex.replace("#", "");
        const r = parseInt(h.substring(0, 2), 16);
        const g = parseInt(h.substring(2, 4), 16);
        const b = parseInt(h.substring(4, 6), 16);
        return { r, g, b };
    }

    private lerpColor(a: string, b: string, t: number) {
        const A = this.hexToRgb(a);
        const B = this.hexToRgb(b);
        const r = Math.round(A.r + (B.r - A.r) * t);
        const g = Math.round(A.g + (B.g - A.g) * t);
        const bl = Math.round(A.b + (B.b - A.b) * t);
        return `rgb(${r},${g},${bl})`;
    }
}
