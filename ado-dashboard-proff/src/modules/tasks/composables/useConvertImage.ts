export function processImageBeforeUpload(imageFile: File): Promise<File> {
    const MAX_DIMENSION = 2048;
    const WEBP_MIME_TYPE = 'image/webp';
    const WEBP_QUALITY = 0.9;

    if (!imageFile.type.startsWith('image/')) {
        return Promise.resolve(imageFile);
    }

    if (imageFile.type === WEBP_MIME_TYPE) {
        return Promise.resolve(imageFile);
    }


    return new Promise((resolve, reject) => {
        const reader = new FileReader();

        reader.onload = (event) => {
            const img = new Image();
            img.onload = () => {
                let { width, height } = img;
                if (width > MAX_DIMENSION || height > MAX_DIMENSION) {
                    const ratio = Math.min(MAX_DIMENSION / width, MAX_DIMENSION / height);
                    width = width * ratio;
                    height = height * ratio;
                }
                const canvas = document.createElement('canvas');
                canvas.width = width;
                canvas.height = height;

                const ctx = canvas.getContext('2d');
                if (!ctx) return reject(new Error('Canvas context could not be created.'));

                ctx.drawImage(img, 0, 0, width, height);

                canvas.toBlob((blob) => {
                    if (!blob) return reject(new Error('Canvas to Blob conversion failed.'));

                    const newFileName = imageFile.name.replace(/\.(jpe?g|png|gif|tiff)$/i, '.webp');
                    const newFile = new File([blob], newFileName, {
                        type: WEBP_MIME_TYPE,
                        lastModified: Date.now(),
                    });

                    resolve(newFile);
                }, WEBP_MIME_TYPE, WEBP_QUALITY);
            };
            img.onerror = () => reject(new Error('Image loading failed.'));
            img.src = event.target?.result as string;
        };
        reader.onerror = () => reject(new Error('File reading failed.'));
        reader.readAsDataURL(imageFile);
    });
}