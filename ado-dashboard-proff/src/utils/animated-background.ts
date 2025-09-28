export default class AnimatedBackground {
    private canvas: HTMLCanvasElement;
    private ctx: CanvasRenderingContext2D;
    private grainCanvas: HTMLCanvasElement;
    private grainCtx: CanvasRenderingContext2D;
    private offsetX: number = 0;
    private offsetY: number = 0;
    private directionX: number = 0.15;
    private directionY: number = 0.1;

    constructor(canvasId: string) {
        this.canvas = document.getElementById(canvasId) as HTMLCanvasElement;
        this.ctx = this.canvas.getContext("2d")!;

        this.grainCanvas = document.createElement("canvas");
        this.grainCtx = this.grainCanvas.getContext("2d")!;

        this.resize();
        this.generateGrain();

        window.addEventListener("resize", () => {
            this.resize();
            this.generateGrain();
        });

        this.animate();
    }

    private resize() {
        this.canvas.width = window.innerWidth;
        this.canvas.height = window.innerHeight;
        this.grainCanvas.width = window.innerWidth;
        this.grainCanvas.height = window.innerHeight;
    }

    private generateGrain() {
        const imageData = this.grainCtx.createImageData(this.grainCanvas.width, this.grainCanvas.height);
        for (let i = 0; i < imageData.data.length; i += 4) {
            const val = Math.random() * 255;
            imageData.data[i] = val;
            imageData.data[i + 1] = val;
            imageData.data[i + 2] = val;
            imageData.data[i + 3] = 65; // noch stärkerer Grain
        }
        this.grainCtx.putImageData(imageData, 0, 0);
    }

    private animate = () => {
        const { width, height } = this.canvas;

        this.offsetX += this.directionX;
        this.offsetY += this.directionY;

        if (this.offsetX > width * 0.05 || this.offsetX < -width * 0.05) this.directionX *= -1;
        if (this.offsetY > height * 0.05 || this.offsetY < -height * 0.05) this.directionY *= -1;

        // Hintergrund tiefschwarz
        this.ctx.fillStyle = "#000000";
        this.ctx.fillRect(0, 0, width, height);

        // Radialer Lichtschein oben rechts
        const gradient = this.ctx.createRadialGradient(
            width - width * 0.1 + this.offsetX, // leicht beweglich
            height * 0.1 + this.offsetY,
            width * 0.05, // sehr kleiner Kern
            width - width * 0.1,
            height * 0.1,
            width * 0.4 // schnell ins Schwarze auslaufend
        );

        gradient.addColorStop(0, "rgba(200, 220, 255, 1)");   // fast weiß-blau
        gradient.addColorStop(0.15, "rgba(120, 160, 255, 0.6)");
        gradient.addColorStop(0.35, "rgba(40, 60, 120, 0.25)");
        gradient.addColorStop(1, "rgba(0, 0, 0, 0)");         // komplett schwarz

        this.ctx.fillStyle = gradient;
        this.ctx.fillRect(0, 0, width, height);

        // Grain drüberlegen
        this.ctx.globalAlpha = 0.35; // kräftiger sichtbar
        this.ctx.drawImage(this.grainCanvas, 0, 0, width, height);
        this.ctx.globalAlpha = 1.0;

        // leichte Vignette für noch mehr Tiefe
        const vignette = this.ctx.createRadialGradient(
            width / 2, height / 2, width * 0.4,
            width / 2, height / 2, width * 0.9
        );
        vignette.addColorStop(0, "rgba(0,0,0,0)");
        vignette.addColorStop(1, "rgba(0,0,0,0.85)");
        this.ctx.fillStyle = vignette;
        this.ctx.fillRect(0, 0, width, height);

        requestAnimationFrame(this.animate);
    };
}
