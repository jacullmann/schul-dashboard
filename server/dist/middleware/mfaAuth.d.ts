import type { Request, Response, NextFunction } from 'express';
export declare function generateMfaPendingToken(res: Response, userId: string, email: string, secret: string): string;
export declare function clearMfaPendingToken(res: Response): void;
export declare function verifyMfaPendingToken(secret: string): (req: Request, res: Response, next: NextFunction) => void;
export declare function verifyTotpCode(code: string, secret: string): boolean;
export declare function configureOtplib(): void;
//# sourceMappingURL=mfaAuth.d.ts.map