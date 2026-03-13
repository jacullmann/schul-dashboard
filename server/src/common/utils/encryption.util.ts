import * as crypto from 'crypto';

interface EncryptedPayload {
  iv: string;
  data: string;
  authTag: string;
}

interface CacheEntry {
  key: Buffer;
  ts: number;
}

const KEY_CACHE = new Map<string, CacheEntry>();
const KEY_CACHE_TTL_MS = 5 * 60 * 1000;
const KEY_CACHE_MAX_SIZE = 500;

async function deriveKey(userId: string): Promise<Buffer> {
  const now = Date.now();
  const cached = KEY_CACHE.get(userId);
  if (cached && now - cached.ts < KEY_CACHE_TTL_MS) {
    return cached.key;
  }

  const keyMaterial =
    process.env.ENCRYPTION_KEY! + (process.env.USER_KEY_PEPPER || '') + userId;

  const salt = crypto
    .createHash('sha256')
    .update(process.env.ENCRYPTION_KEY! + userId)
    .digest();

  const key = await new Promise<Buffer>((resolve, reject) => {
    crypto.scrypt(keyMaterial, salt, 32, (err, derivedKey) => {
      if (err) reject(err);
      else resolve(derivedKey);
    });
  });

  if (KEY_CACHE.size >= KEY_CACHE_MAX_SIZE) {
    const firstKey = KEY_CACHE.keys().next().value;
    if (firstKey !== undefined) {
      KEY_CACHE.delete(firstKey);
    }
  }

  KEY_CACHE.set(userId, { key, ts: now });
  return key;
}

export async function encryptData(
  data: string,
  userId: string,
): Promise<EncryptedPayload> {
  try {
    const algorithm = 'aes-256-gcm';
    const key = await deriveKey(userId);

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

export async function decryptData(
  encryptedData: EncryptedPayload,
  userId: string,
): Promise<string> {
  try {
    const algorithm = 'aes-256-gcm';
    const key = await deriveKey(userId);

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
