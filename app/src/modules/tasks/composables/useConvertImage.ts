export async function processImageBeforeUpload(imageFile: File): Promise<File> {
  const MAX_DIMENSION = 2048;
  const WEBP_MIME_TYPE = 'image/webp';
  const WEBP_QUALITY = 0.9;

  if (
    !imageFile.type.startsWith('image/') ||
    imageFile.type === WEBP_MIME_TYPE
  ) {
    return imageFile;
  }

  try {
    const bmp = await createImageBitmap(imageFile);
    let { width, height } = bmp;

    if (width > MAX_DIMENSION || height > MAX_DIMENSION) {
      const ratio = Math.min(MAX_DIMENSION / width, MAX_DIMENSION / height);
      width = Math.round(width * ratio);
      height = Math.round(height * ratio);
    }

    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;

    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Canvas context could not be created.');

    ctx.drawImage(bmp, 0, 0, width, height);
    bmp.close(); // free memory

    return await new Promise<File>((resolve, reject) => {
      canvas.toBlob(
        (blob) => {
          if (!blob)
            return reject(new Error('Canvas to Blob conversion failed.'));
          const newFileName = imageFile.name.replace(/\.[^/.]+$/, '.webp');
          resolve(
            new File([blob], newFileName, {
              type: WEBP_MIME_TYPE,
              lastModified: Date.now(),
            }),
          );
        },
        WEBP_MIME_TYPE,
        WEBP_QUALITY,
      );
    });
  } catch (error) {
    console.warn(
      'Image processing failed, falling back to original file',
      error,
    );
    return imageFile;
  }
}
