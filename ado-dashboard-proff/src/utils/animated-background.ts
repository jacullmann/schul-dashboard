
export default class AnimatedBackground {
    private canvas: HTMLCanvasElement;
    private ctx: CanvasRenderingContext2D;
    private grainCanvas: HTMLCanvasElement;
    private grainCtx: CanvasRenderingContext2D;
    private shift: number = 0;
    private offsetX: number = 0;
    private offsetY: number = 0;
    private directionX: number = 0.3;
    private directionY: number = 0.2;


    private palette: string[] = [
        "#FF7A00",
        "#FF2D95",
        "#A020F0",
        "#3A0CA3"
    ];

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
            imageData.data[i + 3] = 50;
        }
        this.grainCtx.putImageData(imageData, 0, 0);
    }

    private animate = () => {
        const { width, height } = this.canvas;


        this.offsetX += this.directionX;
        this.offsetY += this.directionY;


        if (this.offsetX > width * 0.2 || this.offsetX < -width * 0.2) this.directionX *= -1;
        if (this.offsetY > height * 0.2 || this.offsetY < -height * 0.2) this.directionY *= -1;


        const gradient = this.ctx.createLinearGradient(
            this.offsetX, this.offsetY,
            width + this.offsetX, height + this.offsetY
        );

        gradient.addColorStop(0, this.palette[0]); // Orange
        gradient.addColorStop(0.33, this.palette[1]); // Pink
        gradient.addColorStop(0.66, this.palette[2]); // Lila
        gradient.addColorStop(1, this.palette[3]); // Blau

        this.ctx.fillStyle = gradient;
        this.ctx.fillRect(0, 0, width, height);


        this.ctx.drawImage(this.grainCanvas, 0, 0, width, height);

        requestAnimationFrame(this.animate);
    };
}
