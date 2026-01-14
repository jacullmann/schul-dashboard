import crypto from 'crypto';

export async function encryptData(data, userId) {
    try {
        const algorithm = 'aes-256-gcm';

        const keyMaterial = process.env.ENCRYPTION_KEY +
            (process.env.USER_KEY_PEPPER || '') +
            userId;

        const salt = crypto.createHash('sha256')
            .update(process.env.ENCRYPTION_KEY + userId)
            .digest();
        const key = await new Promise((resolve, reject) => {
            crypto.scrypt(keyMaterial, salt, 32, (err, derivedKey) => {
                if (err) reject(err);
                else resolve(derivedKey);
            });
        });

        const iv = crypto.randomBytes(16);

        const cipher = crypto.createCipheriv(algorithm, key, iv);
        cipher.setAAD(Buffer.from('todo-encryption'));

        let encrypted = cipher.update(data, 'utf8', 'hex');
        encrypted += cipher.final('hex');
        const authTag = cipher.getAuthTag();

        return {
            iv: iv.toString('hex'),
            data: encrypted,
            authTag: authTag.toString('hex')
        };
    } catch (error) {
        console.error('Encryption error:', error);
        throw new Error('Daten konnten nicht verschlüsselt werden');
    }
}

export async function decryptData(encryptedData, userId) {
    try {
        const algorithm = 'aes-256-gcm';

        const keyMaterial = process.env.ENCRYPTION_KEY +
            (process.env.USER_KEY_PEPPER || '') +
            userId;

        const salt = crypto.createHash('sha256')
            .update(process.env.ENCRYPTION_KEY + userId)
            .digest();
        const key = await new Promise((resolve, reject) => {
            crypto.scrypt(keyMaterial, salt, 32, (err, derivedKey) => {
                if (err) reject(err);
                else resolve(derivedKey);
            });
        });
        const iv = Buffer.from(encryptedData.iv, 'hex');
        const authTag = Buffer.from(encryptedData.authTag, 'hex');

        const decipher = crypto.createDecipheriv(algorithm, key, iv);
        decipher.setAAD(Buffer.from('todo-encryption'));
        decipher.setAuthTag(authTag);

        let decrypted = decipher.update(encryptedData.data, 'hex', 'utf8');
        decrypted += decipher.final('utf8');

        return decrypted;
    } catch (error) {
        console.error('Decryption error:', error);
        throw new Error('Daten konnten nicht entschlüsselt werden');
    }
}