import type { EncryptedPayload } from '../types/index.js';
export declare function encryptData(data: string, userId: string): Promise<EncryptedPayload>;
export declare function decryptData(encryptedData: EncryptedPayload, userId: string): Promise<string>;
//# sourceMappingURL=encryption.d.ts.map