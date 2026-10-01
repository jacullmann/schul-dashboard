/** What the server issues for exactly one upload: the file may only be stored
 * under `publicId`, which the server has already recorded. */
export interface UploadSignature {
  cloudName: string;
  apiKey: string;
  timestamp: number;
  signature: string;
  publicId: string;
}

/** Office documents are stored as raw files, whose public ID keeps the
 * extension; everything else is uploaded as an image. */
export type RawExtension = 'docx' | 'pptx' | 'xlsx';

const RAW_EXTENSION = /\.(docx|pptx|xlsx)$/i;

export function rawExtensionOf(fileName: string): RawExtension | null {
  const extension = RAW_EXTENSION.exec(fileName)?.[1];
  return extension ? (extension.toLowerCase() as RawExtension) : null;
}

/** The part of Cloudinary's upload response the app reads. */
export interface CloudinaryUpload {
  public_id: string;
  secure_url: string;
  version: number;
  format?: string;
  width?: number;
  height?: number;
}

export async function uploadToCloudinary(
  sign: UploadSignature,
  file: Blob,
  resourceType: 'image' | 'raw' = 'image',
): Promise<CloudinaryUpload> {
  const form = new FormData();
  form.set('file', file);
  form.set('api_key', sign.apiKey);
  form.set('timestamp', String(sign.timestamp));
  form.set('signature', sign.signature);
  form.set('public_id', sign.publicId);

  const res = await fetch(
    `https://api.cloudinary.com/v1_1/${sign.cloudName}/${resourceType}/upload`,
    { method: 'POST', body: form },
  );
  if (!res.ok) throw new Error(`Cloudinary ${resourceType} upload failed`);

  return (await res.json()) as CloudinaryUpload;
}
