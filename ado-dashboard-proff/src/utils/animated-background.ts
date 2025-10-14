export default class Cool3DBackgroundV2 {
    private canvas: HTMLCanvasElement;
    private ctx: CanvasRenderingContext2D;

    // Weniger, größere Formen für einen cleanen Look
    private shapes: { x: number; y: number; r: number; color: string; dx: number; dy: number }[] = [];

    // JetBrains-nahe Palette mit blauem Bias
    private palette: string[] = [
        "#0e2a57", // Deep Navy (Hintergrundbasis)
        "#2153f3", // JetBrains Blau
        "#5f2bff", // Violett-Blau
        "#ff007f", // Magenta
        "#00d4ff", // Cyan
        "#ffae00"  // Orange Akzent
    ];

    private speedFactor = 0.25;     // langsame, subtile Bewegung
    private blurPx = 28;            // starke Unschärfe für weichen Look
    private baseBlue = "#0b1633";   // dunkler blauer Grundton

    constructor(canvasId: string) {
        this.canvas = document.getElementById(canvasId) as HTMLCanvasElement;
        this.ctx = this.canvas.getContext("2d")!;
        this.resize();
        window.addEventListener("resize", () => this.resize());
        this.generateShapes();
        this.animate();
    }

    private resize() {
        this.canvas.width = window.innerWidth;
        this.canvas.height = window.innerHeight;
    }

    private generateShapes() {
        const { width, height } = this.canvas;
        this.shapes = [];

        // Wenige große Formen, damit es edel wirkt
        const count = 6;
        for (let i = 0; i < count; i++) {
            const r = Math.min(width, height) * (0.35 + Math.random() * 0.25);
            const biasBlue = i < 3; // erste Formen blauer/cyan-Lastig
            const color = biasBlue
                ? [this.palette[1], this.palette[2], this.palette[4]][Math.floor(Math.random() * 3)]
                : [this.palette[3], this.palette[5]][Math.floor(Math.random() * 2)];

            this.shapes.push({
                x: Math.random() * width,
                y: Math.random() * height,
                r,
                color,
                dx: (Math.random() - 0.5) * this.speedFactor,
                dy: (Math.random() - 0.5) * this.speedFactor
            });
        }
    }

    private drawBaseBackground() {
        const { width, height } = this.canvas;

        // Tiefer blauer Verlauf als Basis
        const g = this.ctx.createLinearGradient(0, 0, width, height);
        g.addColorStop(0, this.baseBlue);
        g.addColorStop(1, "#0f1e47");
        this.ctx.fillStyle = g;
        this.ctx.fillRect(0, 0, width, height);

        // Vignette für Tiefe
        const vignette = this.ctx.createRadialGradient(
            width / 2, height / 2, Math.min(width, height) * 0.2,
            width / 2, height / 2, Math.max(width, height) * 0.8
        );
        vignette.addColorStop(0, "rgba(0,0,0,0.0)");
        vignette.addColorStop(1, "rgba(0,0,0,0.35)");
        this.ctx.fillStyle = vignette;
        this.ctx.fillRect(0, 0, width, height);
    }

    private drawBlurredBlob(x: number, y: number, r: number, color: string) {
        // Starker Blur für weiche, unscharfe Flächen
        this.ctx.filter = `blur(${this.blurPx}px)`;

        const grad = this.ctx.createRadialGradient(x, y, r * 0.15, x, y, r);
        grad.addColorStop(0, this.withAlpha(color, 0.85));
        grad.addColorStop(0.5, this.withAlpha(color, 0.35));
        grad.addColorStop(1, "rgba(0,0,0,0)");

        this.ctx.globalCompositeOperation = "lighter"; // Glow/Additiv
        this.ctx.fillStyle = grad;
        this.ctx.beginPath();
        this.ctx.arc(x, y, r, 0, Math.PI * 2);
        this.ctx.fill();

        // Zurücksetzen
        this.ctx.filter = "none";
        this.ctx.globalCompositeOperation = "source-over";
    }

    private drawSoftOverlay() {
        const { width, height } = this.canvas;

        // Sehr zarter Weiß-Glow über alles, macht es „polished“
        const radial = this.ctx.createRadialGradient(
            width * 0.6, height * 0.35, Math.min(width, height) * 0.1,
            width * 0.6, height * 0.35, Math.max(width, height) * 0.9
        );
        radial.addColorStop(0, "rgba(255,255,255,0.08)");
        radial.addColorStop(1, "rgba(255,255,255,0.00)");
        this.ctx.fillStyle = radial;
        this.ctx.fillRect(0, 0, width, height);

        // Leichte Körnung für Textur
        const grainAlpha = 0.04;
        const imageData = this.ctx.createImageData(128, 128);
        for (let i = 0; i < imageData.data.length; i += 4) {
            const val = Math.random() * 255;
            imageData.data[i] = val;
            imageData.data[i + 1] = val;
            imageData.data[i + 2] = val;
            imageData.data[i + 3] = grainAlpha * 255;
        }
        const patternCanvas = document.createElement("canvas");
        patternCanvas.width = 128;
        patternCanvas.height = 128;
        const pctx = patternCanvas.getContext("2d")!;
        pctx.putImageData(imageData, 0, 0);
        const pattern = this.ctx.createPattern(patternCanvas, "repeat")!;
        this.ctx.globalAlpha = 0.8;
        this.ctx.fillStyle = pattern;
        this.ctx.fillRect(0, 0, width, height);
        this.ctx.globalAlpha = 1;
    }

    private withAlpha(hex: string, alpha: number) {
        // Unterstützt #rrggbb
        const c = hex.replace("#", "");
        const r = parseInt(c.substring(0, 2), 16);
        const g = parseInt(c.substring(2, 4), 16);
        const b = parseInt(c.substring(4, 6), 16);
        return `rgba(${r},${g},${b},${alpha})`;
    }

    private animate = () => {
        const { width, height } = this.canvas;

        // Basis
        this.drawBaseBackground();

        // Langsame Bewegung der weichen Farbflächen
        for (const s of this.shapes) {
            s.x += s.dx;
            s.y += s.dy;

            // sanftes Wrapping
            if (s.x < -s.r) s.x = width + s.r;
            if (s.x > width + s.r) s.x = -s.r;
            if (s.y < -s.r) s.y = height + s.r;
            if (s.y > height + s.r) s.y = -s.r;

            this.drawBlurredBlob(s.x, s.y, s.r, s.color);
        }

        // Polierter Gesamtlook
        this.drawSoftOverlay();

        requestAnimationFrame(this.animate);
    };
}
