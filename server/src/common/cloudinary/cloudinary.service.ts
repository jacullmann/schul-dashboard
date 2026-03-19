import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { v2 as cloudinary } from 'cloudinary';

@Injectable()
export class CloudinaryService {
  constructor(private readonly configService: ConfigService) {
    cloudinary.config({
      cloud_name: this.configService.get<string>('CLOUDINARY_CLOUD_NAME'),
      api_key: this.configService.get<string>('CLOUDINARY_API_KEY'),
      api_secret: this.configService.get<string>('CLOUDINARY_API_SECRET'),
    });
  }

  async deleteResources(publicIds: string[]) {
    if (!publicIds || publicIds.length === 0) return;

    const batches: string[][] = [];
    for (let i = 0; i < publicIds.length; i += 100) {
      batches.push(publicIds.slice(i, i + 100));
    }

    await Promise.all(
      batches.map(async (batch) => {
        try {
          await (cloudinary.api as any).delete_resources(batch);
        } catch (e) {
          console.error('Cloudinary batch delete error:', e);
        }
      }),
    );
  }

  async deleteResource(publicId: string) {
    if (!publicId) return;
    try {
      await cloudinary.uploader.destroy(publicId);
    } catch (e) {
      console.error('Cloudinary error', e);
    }
  }

  createUploadSignature() {
    const timestamp = Math.floor(Date.now() / 1000);
    const apiSecret = this.configService.get<string>('CLOUDINARY_API_SECRET')!;
    const folder =
      this.configService.get<string>('CLOUDINARY_FOLDER') || 'hausaufgaben';

    const signature = cloudinary.utils.api_sign_request(
      { timestamp, folder },
      apiSecret,
    );

    return {
      cloudName: this.configService.get<string>('CLOUDINARY_CLOUD_NAME'),
      apiKey: this.configService.get<string>('CLOUDINARY_API_KEY'),
      timestamp,
      signature,
      folder,
    };
  }
}
