import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as crypto from 'crypto';
import { EnvironmentVariables } from '../configs/env.config';

interface EncryptedPayload {
  iv: string;
  data: string;
  authTag: string;
}

interface CacheEntry {
  key: Buffer;
  ts: number;
}

@Injectable()
export class EncryptionService {
  private readonly KEY_CACHE = new Map<string, CacheEntry>();
  private readonly KEY_CACHE_TTL_MS = 5 * 60 * 1000;
  private readonly KEY_CACHE_MAX_SIZE = 500;

  constructor(private readonly configService: ConfigService<EnvironmentVariables, true>) {}

  private async deriveKey(userId: string): Promise<Buffer> {
    const now = Date.now();
    const cached = this.KEY_CACHE.get(userId);
    if (cached && now - cached.ts < this.KEY_CACHE_TTL_MS) {
      return cached.key;
    }

    const encryptionKey = this.configService.get('ENCRYPTION_KEY');
    const pepper = this.configService.get('USER_KEY_PEPPER') || '';
    
    const keyMaterial = encryptionKey + pepper + userId;

    const salt = crypto
      .createHash('sha256')
      .update(encryptionKey + userId)
      .digest();

    const key = await new Promise<Buffer>((resolve, reject) => {
      crypto.scrypt(keyMaterial, salt, 32, (err, derivedKey) => {
        if (err) reject(err);
        else resolve(derivedKey);
      });
    });

    if (this.KEY_CACHE.size >= this.KEY_CACHE_MAX_SIZE) {
      const firstKey = this.KEY_CACHE.keys().next().value;
      if (firstKey !== undefined) {
        this.KEY_CACHE.delete(firstKey);
      }
    }

    this.KEY_CACHE.set(userId, { key, ts: now });
    return key;
  }

  async encryptData(data: string, userId: string): Promise<EncryptedPayload> {
    try {
      const algorithm = 'aes-256-gcm';
      const key = await this.deriveKey(userId);

      const iv = crypto.randomBytes(16);

      const cipher = crypto.createCipheriv(algorithm, key, iv);
      cipher.setAAD(Buffer.from('todo-encryption'));

      let encrypted = cipher.update(data, 'utf8', 'hex');
      encrypted += cipher.final('hex');
      const authTag = cipher.getAuthTag();

      return {
        iv: iv.toString('hex'),
        data: encrypted,
        authTag: authTag.toString('hex'),
      };
    } catch (error) {
      throw new Error('Daten konnten nicht verschlüsselt werden');
    }
  }

  async decryptData(encryptedData: EncryptedPayload, userId: string): Promise<string> {
    try {
      const algorithm = 'aes-256-gcm';
      const key = await this.deriveKey(userId);

      const iv = Buffer.from(encryptedData.iv, 'hex');
      const authTag = Buffer.from(encryptedData.authTag, 'hex');

      const decipher = crypto.createDecipheriv(algorithm, key, iv);
      decipher.setAAD(Buffer.from('todo-encryption'));
      decipher.setAuthTag(authTag);

      let decrypted = decipher.update(encryptedData.data, 'hex', 'utf8');
      decrypted += decipher.final('utf8');
      return decrypted;
    } catch (error) {
      throw new Error('Daten konnten nicht entschlüsselt werden');
    }
  }
}
